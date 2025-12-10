import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/driver/stats
 * Fetch statistics for the logged-in driver
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt((session.user as any).id)

    // Count completed routes
    const completedRoutes = await prisma.route.count({
      where: {
        driverId: userId,
        status: 'completed',
      },
    })

    // Count total pickups (completed addresses)
    const completedAddresses = await prisma.deliveryLog.count({
      where: {
        driverId: userId,
      },
    })

    // Calculate volunteer hours (rough estimate: 15 min per stop + 1 hour route overhead)
    const estimatedMinutes = completedAddresses * 15 + completedRoutes * 60
    const hours = Math.floor(estimatedMinutes / 60)
    const minutes = estimatedMinutes % 60
    const volunteerHours = `${hours}h ${minutes}m`

    return NextResponse.json({
      stats: {
        completedRoutes,
        totalPickups: completedAddresses,
        totalVolunteerHours: volunteerHours,
      },
    })
  } catch (error) {
    console.error('Error fetching driver stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
