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

    // Get volunteer stats
    const hourLogs = await prisma.volunteerHourLog.findMany({
      where: {
        userId: user.id,
        totalMinutes: { not: null },
      },
    })

    const totalMinutes = hourLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0)
    const totalHours = totalMinutes / 60

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        totalHours,
        totalShifts: hourLogs.length,
      },
    })
  } catch (error) {
    console.error('Error fetching volunteer profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
