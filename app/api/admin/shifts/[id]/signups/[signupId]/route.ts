import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import { sendVolunteerShiftConfirmationEmail } from '@/lib/services/email'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signupId: string }> }
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

    const { id, signupId } = await params
    const shiftId = parseInt(id)
    const signupIdInt = parseInt(signupId)

    const body = await request.json()
    const { action } = body // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

    const signup = await prisma.volunteerSignup.findUnique({
      where: { id: signupIdInt },
      include: {
        user: true,
        shift: true,
      },
    })

    if (!signup || signup.shiftId !== shiftId) {
      return NextResponse.json(
        { success: false, error: 'Signup not found' },
        { status: 404 }
      )
    }

    if (action === 'approve') {
      await prisma.volunteerSignup.update({
        where: { id: signupIdInt },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedById: user.id,
        },
      })

      // Send confirmation email
      const shiftDate = signup.shift.date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const time = `${signup.shift.startTime} - ${signup.shift.endTime}`

      await sendVolunteerShiftConfirmationEmail(
        signup.user.email,
        signup.user.name,
        shiftDate,
        time,
        signup.shift.location
      )

      return NextResponse.json({
        success: true,
        message: 'Signup approved',
      })
    } else {
      // Reject - set to cancelled
      await prisma.volunteerSignup.update({
        where: { id: signupIdInt },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Signup rejected',
      })
    }
  } catch (error) {
    console.error('Error updating signup:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update signup' },
      { status: 500 }
    )
  }
}
