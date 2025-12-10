import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/reports/completed-routes
 * Get list of all completed routes
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

    // Get all archived routes (permanent historical record)
    const routes = await prisma.routeArchive.findMany({
      orderBy: { routeDate: 'desc' },
    })

    // Transform data
    const routesData = routes.map((route) => ({
      id: route.id,
      originalRouteId: route.routeId,
      name: route.routeName,
      date: route.routeDate,
      driverName: route.driverName || 'Unassigned',
      totalStops: route.totalStops,
      completedStops: route.completedStops,
      completionRate: route.completionRate,
      volunteerHours: route.volunteerHours,
      archivedAt: route.completedAt,
    }))

    return NextResponse.json({
      success: true,
      data: routesData,
    })
  } catch (error) {
    console.error('Error fetching completed routes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch completed routes' },
      { status: 500 }
    )
  }
}
