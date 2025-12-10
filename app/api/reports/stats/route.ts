import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/reports/stats
 * Get overall statistics for the reports page
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

    // Get total drivers
    const totalDrivers = await prisma.user.count({
      where: { role: 'driver' },
    })

    // Get total unique addresses across all routes
    const totalAddresses = await prisma.address.count()

    // Get completed routes from archive (permanent historical record)
    const completedRoutes = await prisma.routeArchive.count()

    // Calculate total volunteer hours from archived routes
    const archivedRoutes = await prisma.routeArchive.findMany({
      select: { volunteerHours: true },
    })
    const totalVolunteerHours = archivedRoutes.reduce(
      (sum, route) => sum + route.volunteerHours,
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        totalDrivers,
        totalAddresses,
        completedRoutes,
        totalVolunteerHours,
      },
    })
  } catch (error) {
    console.error('Error fetching report stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report stats' },
      { status: 500 }
    )
  }
}
