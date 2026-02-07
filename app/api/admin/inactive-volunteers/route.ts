import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/admin/inactive-volunteers
 * Get volunteers who haven't participated in recent shifts
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

    // Get all volunteers with their activity
    const volunteers = await prisma.user.findMany({
      where: {
        isVolunteer: true,
        active: true,
      },
      include: {
        volunteerHourLogs: {
          orderBy: { clockIn: 'desc' },
          take: 1,
        },
        volunteerSignups: {
          where: {
            status: { in: ['approved', 'pending'] },
          },
          include: {
            shift: true,
          },
          orderBy: {
            shift: { date: 'desc' },
          },
          take: 1,
        },
      },
    })

    // Filter to find inactive volunteers
    const inactiveVolunteers = volunteers
      .filter((volunteer) => {
        const lastHourLog = volunteer.volunteerHourLogs[0]
        const lastSignup = volunteer.volunteerSignups[0]

        // Get the most recent activity date
        let lastActivity: Date | null = null

        if (lastHourLog) {
          lastActivity = lastHourLog.clockIn
        }

        if (lastSignup?.shift?.date) {
          if (!lastActivity || lastSignup.shift.date > lastActivity) {
            lastActivity = lastSignup.shift.date
          }
        }

        // If no activity, use account creation date
        if (!lastActivity) {
          return volunteer.createdAt < cutoffDate
        }

        return lastActivity < cutoffDate
      })
      .map((volunteer) => {
        const lastHourLog = volunteer.volunteerHourLogs[0]
        const lastSignup = volunteer.volunteerSignups[0]

        let lastActivityDate = volunteer.createdAt
        if (lastHourLog) {
          lastActivityDate = lastHourLog.clockIn
        }
        if (lastSignup?.shift?.date && lastSignup.shift.date > lastActivityDate) {
          lastActivityDate = lastSignup.shift.date
        }

        // Calculate total hours
        const totalMinutes = volunteer.volunteerHourLogs.reduce(
          (sum, log) => sum + (log.totalMinutes || 0),
          0
        )

        return {
          id: volunteer.id,
          name: volunteer.name,
          email: volunteer.email,
          phone: volunteer.phone,
          lastActivityDate,
          totalHours: Math.round(totalMinutes / 60 * 10) / 10,
          daysSinceActivity: Math.floor(
            (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
          ),
        }
      })
      .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)

    // Get upcoming shifts for context
    const upcomingShifts = await prisma.volunteerShift.findMany({
      where: {
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
      take: 5,
    })

    return NextResponse.json({
      success: true,
      data: {
        inactiveVolunteers,
        totalInactive: inactiveVolunteers.length,
        cutoffDate: cutoffDate.toISOString(),
        inactiveDays,
        upcomingShifts: upcomingShifts.map((s) => ({
          id: s.id,
          date: s.date.toISOString(),
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching inactive volunteers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inactive volunteers' },
      { status: 500 }
    )
  }
}
