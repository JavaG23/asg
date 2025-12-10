import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/reports/drivers
 * Get list of all drivers with their statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access reports
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all drivers with their route counts
    const drivers = await prisma.user.findMany({
      where: { role: 'driver' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        _count: {
          select: {
            routes: {
              where: { status: 'completed' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Transform data to include calculated stats
    const driversWithStats = drivers.map((driver) => ({
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      routesCompleted: driver._count.routes,
      volunteerHours: driver._count.routes * 2, // Estimate 2 hours per route
    }))

    return NextResponse.json({
      success: true,
      data: driversWithStats,
    })
  } catch (error) {
    console.error('Error fetching drivers report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drivers report' },
      { status: 500 }
    )
  }
}
