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

    if (!user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    const shifts = await prisma.volunteerShift.findMany({
      include: {
        signups: {
          select: {
            status: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: shifts.map((shift) => ({
        id: shift.id,
        date: shift.date.toISOString(),
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.location,
        spotsNeeded: shift.spotsNeeded,
        notes: shift.notes,
        signupCounts: {
          pending: shift.signups.filter((s) => s.status === 'pending').length,
          approved: shift.signups.filter((s) => s.status === 'approved').length,
          waitlisted: shift.signups.filter((s) => s.status === 'waitlisted').length,
        },
      })),
    })
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}

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

    if (!user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { date, startTime, endTime, location, spotsNeeded, notes } = body

    if (!date || !startTime || !endTime || !location || !spotsNeeded) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Parse date at noon UTC to avoid timezone day-boundary issues
    const shiftDate = new Date(date + 'T12:00:00Z')

    const shift = await prisma.volunteerShift.create({
      data: {
        date: shiftDate,
        startTime,
        endTime,
        location,
        spotsNeeded: parseInt(spotsNeeded),
        notes: notes || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: shift,
    })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create shift' },
      { status: 500 }
    )
  }
}
