import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const shiftId = parseInt(id)

    const shift = await prisma.volunteerShift.findUnique({
      where: { id: shiftId },
      include: {
        signups: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            requestedAt: 'asc',
          },
        },
      },
    })

    if (!shift) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: shift.id,
        date: shift.date.toISOString(),
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.location,
        spotsNeeded: shift.spotsNeeded,
        notes: shift.notes,
        signups: shift.signups.map((signup) => ({
          id: signup.id,
          userId: signup.userId,
          userName: signup.user.name,
          userEmail: signup.user.email,
          userPhone: signup.user.phone,
          status: signup.status,
          requestedAt: signup.requestedAt.toISOString(),
          approvedAt: signup.approvedAt?.toISOString() || null,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching shift:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shift' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const shiftId = parseInt(id)

    await prisma.volunteerShift.delete({
      where: { id: shiftId },
    })

    return NextResponse.json({
      success: true,
      message: 'Shift deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete shift' },
      { status: 500 }
    )
  }
}
