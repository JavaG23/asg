import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

interface VolunteerHourEntry {
  id: number
  userName: string
  userEmail: string
  shiftDate: string | null
  shiftLocation: string | null
  clockIn: string
  clockOut: string | null
  totalMinutes: number | null
  notes: string | null
  isDriver: boolean
  isVolunteer: boolean
}

interface VolunteerSummary {
  userId: number
  userName: string
  userEmail: string
  totalHours: number
  totalSessions: number
  isDriver: boolean
  isVolunteer: boolean
}

/**
 * GET /api/reports/volunteer-hours
 * Get volunteer hours data with optional date range filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter: { clockIn?: { gte?: Date; lte?: Date } } = {}
    if (startDate) {
      dateFilter.clockIn = { ...dateFilter.clockIn, gte: new Date(startDate) }
    }
    if (endDate) {
      // Add one day to include the end date fully
      const endDateTime = new Date(endDate)
      endDateTime.setDate(endDateTime.getDate() + 1)
      dateFilter.clockIn = { ...dateFilter.clockIn, lte: endDateTime }
    }

    // Fetch volunteer hour logs
    const hourLogs = await prisma.volunteerHourLog.findMany({
      where: dateFilter,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isDriver: true,
            isVolunteer: true,
          },
        },
        shift: {
          select: {
            date: true,
            location: true,
          },
        },
      },
      orderBy: { clockIn: 'desc' },
    })

    // Transform to entries
    const entries: VolunteerHourEntry[] = hourLogs.map((log) => ({
      id: log.id,
      userName: log.user.name,
      userEmail: log.user.email,
      shiftDate: log.shift?.date?.toISOString() || null,
      shiftLocation: log.shift?.location || null,
      clockIn: log.clockIn.toISOString(),
      clockOut: log.clockOut?.toISOString() || null,
      totalMinutes: log.totalMinutes,
      notes: log.notes,
      isDriver: log.user.isDriver,
      isVolunteer: log.user.isVolunteer,
    }))

    // Calculate summaries per volunteer
    const summaryMap = new Map<number, VolunteerSummary>()

    for (const log of hourLogs) {
      const existing = summaryMap.get(log.user.id)
      const minutes = log.totalMinutes || 0

      if (existing) {
        existing.totalHours += minutes / 60
        existing.totalSessions += 1
      } else {
        summaryMap.set(log.user.id, {
          userId: log.user.id,
          userName: log.user.name,
          userEmail: log.user.email,
          totalHours: minutes / 60,
          totalSessions: 1,
          isDriver: log.user.isDriver,
          isVolunteer: log.user.isVolunteer,
        })
      }
    }

    const summaries: VolunteerSummary[] = Array.from(summaryMap.values())
      .sort((a, b) => b.totalHours - a.totalHours)

    // Calculate totals
    const totalHours = summaries.reduce((sum, s) => sum + s.totalHours, 0)
    const totalSessions = entries.length
    const uniqueVolunteers = summaries.length

    // Count unique people (driver+volunteer = 1 person)
    const uniquePeopleCount = summaries.length

    return NextResponse.json({
      success: true,
      data: {
        entries,
        summaries,
        totals: {
          totalHours: Math.round(totalHours * 10) / 10,
          totalSessions,
          uniqueVolunteers,
          uniquePeopleCount,
        },
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching volunteer hours report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch volunteer hours report' },
      { status: 500 }
    )
  }
}
