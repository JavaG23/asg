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
    const eventId = parseInt(id)

    if (isNaN(eventId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    // Get optional cancel reason from body
    let cancelReason = null
    try {
      const body = await request.json()
      cancelReason = body.reason || null
    } catch {
      // No body provided, that's fine
    }

    // Get the user with donor info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        donor: true,
      },
    })

    if (!user || !user.isDonor || !user.donor) {
      return NextResponse.json(
        { success: false, error: 'User is not a donor' },
        { status: 403 }
      )
    }

    // Check if opted in
    const optIn = await prisma.donorEventOptIn.findUnique({
      where: {
        donorId_eventId: {
          donorId: user.donor.id,
          eventId,
        },
      },
    })

    if (!optIn) {
      return NextResponse.json(
        { success: false, error: 'Not opted in to this event' },
        { status: 404 }
      )
    }

    if (optIn.status !== 'opted_in') {
      return NextResponse.json(
        { success: false, error: 'Already cancelled or completed' },
        { status: 400 }
      )
    }

    // Update to cancelled
    await prisma.donorEventOptIn.update({
      where: { id: optIn.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Pickup cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling opt-in:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel' },
      { status: 500 }
    )
  }
}
