import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/reports/drivers/[id]
 * Get detailed information about a specific driver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access reports
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const driverId = parseInt(params.id)

    if (isNaN(driverId)) {
      return NextResponse.json(
        { error: 'Invalid driver ID' },
        { status: 400 }
      )
    }

    // Get driver with complete route history
    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      include: {
        routes: {
          include: {
            addresses: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
        deliveryLogs: {
          select: {
            id: true,
            completedAt: true,
            address: {
              select: {
                streetAddress: true,
                city: true,
                state: true,
              },
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
          take: 10, // Most recent 10 deliveries
        },
      },
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Calculate statistics
    const completedRoutes = driver.routes.filter((r) => r.status === 'completed')
    const totalStops = driver.routes.reduce(
      (sum, route) => sum + route.addresses.length,
      0
    )
    const completedStops = driver.routes.reduce(
      (sum, route) =>
        sum + route.addresses.filter((a) => a.status === 'completed').length,
      0
    )

    // Format route history
    const routeHistory = driver.routes.map((route) => ({
      id: route.id,
      name: route.name,
      date: route.date,
      status: route.status,
      totalStops: route.addresses.length,
      completedStops: route.addresses.filter((a) => a.status === 'completed')
        .length,
    }))

    return NextResponse.json({
      success: true,
      data: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        bloomerangId: driver.bloomerangId,
        routesCompleted: completedRoutes.length,
        totalRoutes: driver.routes.length,
        totalStops,
        completedStops,
        volunteerHours: completedRoutes.length * 2, // Estimate
        routeHistory,
        recentDeliveries: driver.deliveryLogs,
      },
    })
  } catch (error) {
    console.error('Error fetching driver details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch driver details' },
      { status: 500 }
    )
  }
}
