import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.isVolunteer) {
      return NextResponse.json(
        { success: false, error: 'User is not a volunteer' },
        { status: 403 }
      )
    }

    // Get all hour logs for this user
    const logs = await prisma.volunteerHourLog.findMany({
      where: {
        userId: user.id,
      },
      include: {
        shift: true,
        opportunityType: { select: { id: true, name: true } },
      },
      orderBy: {
        clockIn: 'desc',
      },
    })

    // Calculate totals
    const completedLogs = logs.filter((log) => log.totalMinutes !== null)
    const totalMinutes = completedLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0)
    const totalHours = totalMinutes / 60

    // Hours this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const logsThisMonth = completedLogs.filter((log) => log.clockIn >= startOfMonth)
    const minutesThisMonth = logsThisMonth.reduce((sum, log) => sum + (log.totalMinutes || 0), 0)
    const hoursThisMonth = minutesThisMonth / 60

    // Hours this year
    const startOfYear = new Date()
    startOfYear.setMonth(0, 1)
    startOfYear.setHours(0, 0, 0, 0)

    const logsThisYear = completedLogs.filter((log) => log.clockIn >= startOfYear)
    const minutesThisYear = logsThisYear.reduce((sum, log) => sum + (log.totalMinutes || 0), 0)
    const hoursThisYear = minutesThisYear / 60

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((log) => ({
          id: log.id,
          clockIn: log.clockIn.toISOString(),
          clockOut: log.clockOut?.toISOString() || null,
          totalMinutes: log.totalMinutes,
          notes: log.notes,
          shiftDate: log.shift?.date.toISOString() || null,
          shiftLocation: log.shift?.location || null,
          opportunityType: log.opportunityType?.name || null,
          source: log.source,
          verified: log.verified,
        })),
        totalHours,
        totalShifts: completedLogs.length,
        hoursThisMonth,
        hoursThisYear,
      },
    })
  } catch (error) {
    console.error('Error fetching volunteer hours:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hours' },
      { status: 500 }
    )
  }
}

// 65j: manual hour entry for self-reported/registration opportunities
// (mirrors Bloomerang's "Add Hours Worked": pick opportunity, date, hours,
// comment). Entries start unverified; admins verify in /admin/volunteers.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user || !user.isVolunteer) {
      return NextResponse.json({ success: false, error: 'User is not a volunteer' }, { status: 403 })
    }

    const body = await request.json()
    const opportunityTypeId = Number(body.opportunityTypeId)
    const hours = Number(body.hours)
    const dateStr = typeof body.date === 'string' ? body.date : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

    if (!Number.isInteger(opportunityTypeId) || !dateStr || !(hours > 0) || hours > 24) {
      return NextResponse.json(
        { success: false, error: 'opportunityTypeId, date, and hours (0-24) are required' },
        { status: 400 }
      )
    }
    if (!notes) {
      return NextResponse.json(
        { success: false, error: 'Please add a comment describing the work done' },
        { status: 400 }
      )
    }

    const type = await prisma.opportunityType.findUnique({ where: { id: opportunityTypeId } })
    if (!type || !type.active || !['self-reported', 'registration'].includes(type.kind)) {
      return NextResponse.json(
        { success: false, error: 'Hours can only be self-reported for self-reported or registration opportunities' },
        { status: 400 }
      )
    }

    const clockIn = new Date(dateStr + 'T12:00:00Z')
    if (isNaN(clockIn.getTime()) || clockIn > new Date()) {
      return NextResponse.json(
        { success: false, error: 'Date must be a valid past date' },
        { status: 400 }
      )
    }
    const totalMinutes = Math.round(hours * 60)
    const clockOut = new Date(clockIn.getTime() + totalMinutes * 60000)

    const log = await prisma.volunteerHourLog.create({
      data: {
        userId: user.id,
        opportunityTypeId,
        clockIn,
        clockOut,
        totalMinutes,
        notes,
        source: 'manual',
        verified: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Hours submitted — thank you! An admin may verify them.',
      data: { id: log.id, totalMinutes },
    })
  } catch (error) {
    console.error('Error logging manual hours:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log hours' },
      { status: 500 }
    )
  }
}
