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

    // Find the signup
    const signup = await prisma.volunteerSignup.findUnique({
      where: {
        userId_shiftId: {
          userId: user.id,
          shiftId,
        },
      },
      include: {
        shift: true,
      },
    })

    if (!signup) {
      return NextResponse.json(
        { success: false, error: 'Signup not found' },
        { status: 404 }
      )
    }

    if (signup.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Already cancelled' },
        { status: 400 }
      )
    }

    const wasApproved = signup.status === 'approved'

    // Update to cancelled
    await prisma.volunteerSignup.update({
      where: { id: signup.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    })

    // If they were approved, check if someone on waitlist can be promoted
    if (wasApproved) {
      const nextWaitlisted = await prisma.volunteerSignup.findFirst({
        where: {
          shiftId,
          status: 'waitlisted',
        },
        orderBy: {
          requestedAt: 'asc',
        },
        include: {
          user: true,
        },
      })

      if (nextWaitlisted) {
        // Promote to pending (admin will need to approve)
        await prisma.volunteerSignup.update({
          where: { id: nextWaitlisted.id },
          data: {
            status: 'pending',
          },
        })

        // TODO: Send notification email to the promoted volunteer
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Signup cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling signup:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel' },
      { status: 500 }
    )
  }
}
