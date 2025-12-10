import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * POST /api/routes/[id]/archive
 * Archive a completed route to the permanent history
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

    const routeId = parseInt(params.id)

    if (isNaN(routeId)) {
      return NextResponse.json(
        { error: 'Invalid route ID' },
        { status: 400 }
      )
    }

    // Get complete route data with all related information
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        driver: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        addresses: {
          orderBy: {
            sequenceOrder: 'asc',
          },
          include: {
            deliveryLogs: {
              include: {
                driver: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: {
                completedAt: 'desc',
              },
              take: 1, // Most recent log for each address
            },
          },
        },
      },
    })

    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      )
    }

    // Check if already archived
    const existingArchive = await prisma.routeArchive.findFirst({
      where: { routeId: route.id },
    })

    if (existingArchive) {
      return NextResponse.json({
        success: true,
        message: 'Route already archived',
        archiveId: existingArchive.id,
      })
    }

    // Calculate statistics
    const totalStops = route.addresses.length
    const completedStops = route.addresses.filter((a) => a.status === 'completed').length
    const skippedStops = route.addresses.filter((a) => a.status === 'skipped').length
    const completionRate = totalStops > 0 ? (completedStops / totalStops) * 100 : 0
    const volunteerHours = 2 // Estimate 2 hours per route

    // Prepare snapshot data
    const routeSnapshot = {
      route: {
        id: route.id,
        name: route.name,
        date: route.date,
        status: route.status,
        driverId: route.driverId,
      },
      driver: route.driver,
      addresses: route.addresses.map((addr) => ({
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
      stats: {
        totalStops,
        completedStops,
        skippedStops,
        completionRate,
        volunteerHours,
      },
      archivedAt: new Date().toISOString(),
    }

    // Create archive record
    const archive = await prisma.routeArchive.create({
      data: {
        routeId: route.id,
        routeName: route.name,
        routeDate: route.date,
        driverName: route.driver?.name || null,
        driverEmail: route.driver?.email || null,
        driverPhone: route.driver?.phone || null,
        totalStops,
        completedStops,
        skippedStops,
        completionRate,
        volunteerHours,
        routeData: JSON.stringify(routeSnapshot),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Route archived successfully',
      archiveId: archive.id,
    })
  } catch (error) {
    console.error('Error archiving route:', error)
    return NextResponse.json(
      { error: 'Failed to archive route' },
      { status: 500 }
    )
  }
}
