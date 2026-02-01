import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/database/client'
import { authOptions } from '@/lib/auth/config'
import { logChange } from '@/lib/services/changelog'

/**
 * POST /api/routes/[id]/weight
 * Enter the total weight for a route and mark it as completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can enter weight
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const routeId = parseInt(params.id)

    if (isNaN(routeId)) {
      return NextResponse.json(
        { error: 'Invalid route ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { weight } = body

    if (typeof weight !== 'number' || weight <= 0) {
      return NextResponse.json(
        { error: 'Weight must be a positive number' },
        { status: 400 }
      )
    }

    // Get current route
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: { name: true, status: true, totalWeight: true },
    })

    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      )
    }

    // Update route with weight and mark as completed
    const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: {
        totalWeight: weight,
        weighedAt: new Date(),
        status: 'completed',
      },
    })

    // Log the change
    const userId = parseInt((session.user as any).id)
    const userName = (session.user as any).name
    await logChange({
      userId,
      userName,
      action: 'update',
      entityType: 'route',
      entityId: routeId,
      entityName: route.name,
      field: 'totalWeight',
      oldValue: route.totalWeight,
      newValue: weight,
      metadata: { statusChange: `${route.status} -> completed` },
    })

    // Archive the completed route to permanent history
    try {
      // Get complete route data for archiving
      const completeRoute = await prisma.route.findUnique({
        where: { id: routeId },
        include: {
          driver: { select: { name: true, email: true, phone: true } },
          addresses: {
            orderBy: { sequenceOrder: 'asc' },
            include: {
              deliveryLogs: {
                include: { driver: { select: { name: true } } },
                orderBy: { completedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      })

      if (completeRoute) {
        // Calculate statistics
        const totalStops = completeRoute.addresses.length
        const completedStops = completeRoute.addresses.filter((a) => a.status === 'completed').length
        const skippedStops = completeRoute.addresses.filter((a) => a.status === 'skipped').length
        const completionRate = totalStops > 0 ? (completedStops / totalStops) * 100 : 0
        const volunteerHours = 2 // Estimate

        // Prepare snapshot
        const routeSnapshot = {
          route: {
            id: completeRoute.id,
            name: completeRoute.name,
            date: completeRoute.date,
            status: 'completed',
            driverId: completeRoute.driverId,
            totalWeight: completeRoute.totalWeight,
            weighedAt: completeRoute.weighedAt,
          },
          driver: completeRoute.driver,
          addresses: completeRoute.addresses.map((addr) => ({
            id: addr.id,
            sequenceOrder: addr.sequenceOrder,
            streetAddress: addr.streetAddress,
            city: addr.city,
            state: addr.state,
            zipCode: addr.zipCode,
            latitude: addr.latitude,
            longitude: addr.longitude,
            specialInstructions: addr.specialInstructions,
            status: addr.status,
            deliveryLog: addr.deliveryLogs[0] || null,
          })),
          stats: { totalStops, completedStops, skippedStops, completionRate, volunteerHours, totalWeight: weight },
          archivedAt: new Date().toISOString(),
        }

        // Check if already archived
        const existingArchive = await prisma.routeArchive.findFirst({
          where: { routeId: completeRoute.id },
        })

        // Create archive if doesn't exist
        if (!existingArchive) {
          await prisma.routeArchive.create({
            data: {
              routeId: completeRoute.id,
              routeName: completeRoute.name,
              routeDate: completeRoute.date,
              driverName: completeRoute.driver?.name || null,
              driverEmail: completeRoute.driver?.email || null,
              driverPhone: completeRoute.driver?.phone || null,
              totalStops,
              completedStops,
              skippedStops,
              completionRate,
              volunteerHours,
              totalWeight: completeRoute.totalWeight,
              startedAt: completeRoute.startedAt,
              weighedAt: completeRoute.weighedAt,
              routeData: JSON.stringify(routeSnapshot),
            },
          })
          console.log('Route archived after weight entry:', completeRoute.id)
        }
      }
    } catch (archiveError) {
      // Log error but don't fail the weight entry
      console.error('Error archiving route:', archiveError)
    }

    return NextResponse.json({
      success: true,
      data: updatedRoute,
      message: 'Weight recorded and route completed',
    })
  } catch (error) {
    console.error('Error entering route weight:', error)
    return NextResponse.json(
      { error: 'Failed to enter weight' },
      { status: 500 }
    )
  }
}
