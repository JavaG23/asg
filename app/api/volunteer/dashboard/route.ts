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

    // Get active clock-in session (no clock out)
    const activeSession = await prisma.volunteerHourLog.findFirst({
      where: {
        userId: user.id,
        clockOut: null,
      },
      include: {
        shift: true,
      },
    })

    // Get upcoming shifts user has signed up for
    const upcomingShifts = await prisma.volunteerSignup.findMany({
      where: {
        userId: user.id,
        status: { in: ['pending', 'approved', 'waitlisted'] },
        shift: {
          date: {
            gte: new Date(),
          },
        },
      },
      include: {
        shift: true,
      },
      orderBy: {
        shift: {
          date: 'asc',
        },
      },
      take: 5,
    })

    // Calculate total hours
    const hourLogs = await prisma.volunteerHourLog.findMany({
      where: {
        userId: user.id,
        totalMinutes: { not: null },
      },
    })

    const totalMinutes = hourLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0)
    const totalHours = totalMinutes / 60

    // Count shifts this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const shiftsThisMonth = await prisma.volunteerHourLog.count({
      where: {
        userId: user.id,
        clockIn: {
          gte: startOfMonth,
        },
        totalMinutes: { not: null },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        activeSession: activeSession
          ? {
              id: activeSession.id,
              clockIn: activeSession.clockIn.toISOString(),
              shiftId: activeSession.shiftId,
              shiftLocation: activeSession.shift?.location || null,
            }
          : null,
        upcomingShifts: upcomingShifts.map((signup) => ({
          id: signup.shiftId,
          date: signup.shift.date.toISOString(),
          startTime: signup.shift.startTime,
          endTime: signup.shift.endTime,
          location: signup.shift.location,
          status: signup.status,
        })),
        totalHours,
        shiftsThisMonth,
      },
    })
  } catch (error) {
    console.error('Error fetching volunteer dashboard:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
