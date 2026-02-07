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
