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

    const body = await request.json()
    const { reminderPreference = '24h' } = body

    // Validate reminder preference
    if (!['24h', '48h', 'none'].includes(reminderPreference)) {
      return NextResponse.json(
        { success: false, error: 'Invalid reminder preference' },
        { status: 400 }
      )
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

    // Check if event exists and is in the future
    const event = await prisma.pickupEvent.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    if (new Date(event.date) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Cannot opt-in to past events' },
        { status: 400 }
      )
    }

    // Check opt-in deadline
    if (event.optInDeadline && new Date(event.optInDeadline) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Opt-in deadline has passed' },
        { status: 400 }
      )
    }

    // Check if already opted in
    const existingOptIn = await prisma.donorEventOptIn.findUnique({
      where: {
        donorId_eventId: {
          donorId: user.donor.id,
          eventId,
        },
      },
    })

    if (existingOptIn) {
      if (existingOptIn.status === 'opted_in') {
        // Update reminder preference
        await prisma.donorEventOptIn.update({
          where: { id: existingOptIn.id },
          data: { reminderPreference },
        })

        return NextResponse.json({
          success: true,
          message: 'Reminder preference updated',
        })
      }

      // Reactivate cancelled opt-in
      await prisma.donorEventOptIn.update({
        where: { id: existingOptIn.id },
        data: {
          status: 'opted_in',
          reminderPreference,
          cancelledAt: null,
          cancelReason: null,
          reminderSentAt: null,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Opted in successfully',
      })
    }

    // Create new opt-in
    await prisma.donorEventOptIn.create({
      data: {
        donorId: user.donor.id,
        eventId,
        status: 'opted_in',
        reminderPreference,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Opted in successfully',
    })
  } catch (error) {
    console.error('Error opting in to event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to opt in' },
      { status: 500 }
    )
  }
}
