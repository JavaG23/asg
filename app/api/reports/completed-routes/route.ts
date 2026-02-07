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
    if (!(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all archived routes (permanent historical record)
    const routes = await prisma.routeArchive.findMany({
      orderBy: { routeDate: 'desc' },
    })

    // Transform data
    const routesData = routes.map((route) => {
      // Parse routeData to extract foodOutside counts and notes
      let foodOutsideYes = 0
      let foodOutsideNo = 0
      const foodOutsideNotes: string[] = []

      try {
        const routeSnapshot = JSON.parse(route.routeData)
        if (routeSnapshot.addresses && Array.isArray(routeSnapshot.addresses)) {
          for (const address of routeSnapshot.addresses) {
            if (address.deliveryLog) {
              if (address.deliveryLog.foodOutside === true) {
                foodOutsideYes++
              } else if (address.deliveryLog.foodOutside === false) {
                foodOutsideNo++
              }
              // Collect notes that exist
              if (address.deliveryLog.notes && address.deliveryLog.notes.trim()) {
                foodOutsideNotes.push(`${address.streetAddress}: ${address.deliveryLog.notes}`)
              }
            }
          }
        }
      } catch (e) {
        // If parsing fails, counts stay at 0
        console.error('Error parsing routeData for route', route.id, e)
      }

      return {
        id: route.id,
        originalRouteId: route.routeId,
        name: route.routeName,
        date: route.routeDate,
        driverName: route.driverName || 'Unassigned',
        totalStops: route.totalStops,
        completedStops: route.completedStops,
        completionRate: route.completionRate,
        volunteerHours: route.volunteerHours,
        totalWeight: route.totalWeight,
        startedAt: route.startedAt,
        weighedAt: route.weighedAt,
        archivedAt: route.completedAt,
        foodOutsideYes,
        foodOutsideNo,
        foodOutsideNotes,
      }
    })

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
