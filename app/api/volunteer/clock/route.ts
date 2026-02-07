import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { action, notes, shiftId } = body

    if (action === 'clockIn') {
      // Check if already clocked in
      const existingSession = await prisma.volunteerHourLog.findFirst({
        where: {
          userId: user.id,
          clockOut: null,
        },
      })

      if (existingSession) {
        return NextResponse.json(
          { success: false, error: 'Already clocked in. Please clock out first.' },
          { status: 400 }
        )
      }

      // Create new hour log
      const hourLog = await prisma.volunteerHourLog.create({
        data: {
          userId: user.id,
          shiftId: shiftId || null,
          clockIn: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Clocked in successfully',
        data: {
          id: hourLog.id,
          clockIn: hourLog.clockIn.toISOString(),
        },
      })
    } else if (action === 'clockOut') {
      // Find active session
      const activeSession = await prisma.volunteerHourLog.findFirst({
        where: {
          userId: user.id,
          clockOut: null,
        },
      })

      if (!activeSession) {
        return NextResponse.json(
          { success: false, error: 'No active clock-in session found' },
          { status: 400 }
        )
      }

      const clockOut = new Date()
      const totalMinutes = Math.round(
        (clockOut.getTime() - activeSession.clockIn.getTime()) / (1000 * 60)
      )

      // Update the session
      const updatedLog = await prisma.volunteerHourLog.update({
        where: { id: activeSession.id },
        data: {
          clockOut,
          totalMinutes,
          notes: notes || null,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Clocked out successfully',
        data: {
          id: updatedLog.id,
          clockIn: updatedLog.clockIn.toISOString(),
          clockOut: updatedLog.clockOut!.toISOString(),
          totalMinutes: updatedLog.totalMinutes,
        },
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "clockIn" or "clockOut".' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error processing clock action:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process clock action' },
      { status: 500 }
    )
  }
}
