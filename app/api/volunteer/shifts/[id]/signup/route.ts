import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

export async function POST(
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

    const { id } = await params
    const shiftId = parseInt(id)

    if (isNaN(shiftId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid shift ID' },
        { status: 400 }
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

    // Check if shift exists
    const shift = await prisma.volunteerShift.findUnique({
      where: { id: shiftId },
      include: {
        _count: {
          select: {
            signups: {
              where: {
                status: 'approved',
              },
            },
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

    if (new Date(shift.date) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Cannot sign up for past shifts' },
        { status: 400 }
      )
    }

    // Check if already signed up
    const existingSignup = await prisma.volunteerSignup.findUnique({
      where: {
        userId_shiftId: {
          userId: user.id,
          shiftId,
        },
      },
    })

    if (existingSignup) {
      if (['pending', 'approved', 'waitlisted'].includes(existingSignup.status)) {
        return NextResponse.json(
          { success: false, error: 'Already signed up for this shift' },
          { status: 400 }
        )
      }

      // Reactivate cancelled signup
      const approvedCount = shift._count.signups
      const status = approvedCount < shift.spotsNeeded ? 'pending' : 'waitlisted'

      await prisma.volunteerSignup.update({
        where: { id: existingSignup.id },
        data: {
          status,
          requestedAt: new Date(),
          cancelledAt: null,
        },
      })

      return NextResponse.json({
        success: true,
        message: status === 'waitlisted' ? 'Added to waitlist' : 'Signup submitted for approval',
        data: { status },
      })
    }

    // Determine status based on available spots
    const approvedCount = shift._count.signups
    const status = approvedCount < shift.spotsNeeded ? 'pending' : 'waitlisted'

    // Create new signup
    const signup = await prisma.volunteerSignup.create({
      data: {
        userId: user.id,
        shiftId,
        status,
      },
    })

    return NextResponse.json({
      success: true,
      message: status === 'waitlisted' ? 'Added to waitlist' : 'Signup submitted for approval',
      data: {
        id: signup.id,
        status: signup.status,
      },
    })
  } catch (error) {
    console.error('Error signing up for shift:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sign up' },
      { status: 500 }
    )
  }
}
