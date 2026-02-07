import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/admin/inactive-donors
 * Get donors who haven't participated in recent events
 * Query params:
 * - inactiveDays: number of days without activity (default 90)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const inactiveDays = parseInt(searchParams.get('inactiveDays') || '90')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays)

    // Get all donors with their last activity
    const donors = await prisma.donor.findMany({
      include: {
        eventOptIns: {
          include: {
            event: true,
          },
          orderBy: {
            event: { date: 'desc' },
          },
        },
        addresses: {
          take: 1,
          orderBy: { id: 'desc' },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
      },
    })

    // Filter to find inactive donors
    const inactiveDonors = donors
      .filter((donor) => {
        // Skip inactive users
        if (donor.user && !donor.user.isActive) return false

        // If they have no opt-ins, check when they were created
        if (donor.eventOptIns.length === 0) {
          return donor.createdAt < cutoffDate
        }

        // Find their last completed or opted_in event
        const lastActivity = donor.eventOptIns.find(
          (optIn) => optIn.status === 'completed' || optIn.status === 'opted_in'
        )

        if (!lastActivity) {
          return donor.createdAt < cutoffDate
        }

        return lastActivity.event.date < cutoffDate
      })
      .map((donor) => {
        const lastOptIn = donor.eventOptIns.find(
          (optIn) => optIn.status === 'completed' || optIn.status === 'opted_in'
        )
        const address = donor.addresses[0]

        return {
          id: donor.id,
          name: donor.name || donor.user?.name || 'Unknown',
          email: donor.email || donor.user?.email || null,
          phone: donor.phone || donor.user?.phone || null,
          address: address
            ? `${address.streetAddress}, ${address.city}, ${address.state} ${address.zipCode}`
            : null,
          lastActivityDate: lastOptIn?.event.date || donor.createdAt,
          totalDonations: donor.eventOptIns.filter((o) => o.status === 'completed').length,
          daysSinceActivity: Math.floor(
            (Date.now() - (lastOptIn?.event.date || donor.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
        }
      })
      .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)

    // Get upcoming events for context
    const upcomingEvents = await prisma.pickupEvent.findMany({
      where: {
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
      take: 5,
    })

    return NextResponse.json({
      success: true,
      data: {
        inactiveDonors,
        totalInactive: inactiveDonors.length,
        cutoffDate: cutoffDate.toISOString(),
        inactiveDays,
        upcomingEvents: upcomingEvents.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          description: e.description,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching inactive donors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inactive donors' },
      { status: 500 }
    )
  }
}
