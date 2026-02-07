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

    const events = await prisma.pickupEvent.findMany({
      include: {
        _count: {
          select: {
            optIns: {
              where: {
                status: 'opted_in',
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: events.map((event) => ({
        id: event.id,
        date: event.date.toISOString(),
        description: event.description,
        optInDeadline: event.optInDeadline?.toISOString() || null,
        optInCount: event._count.optIns,
      })),
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
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
    const { date, description, optInDeadline } = body

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      )
    }

    // Parse date at noon UTC to avoid timezone day-boundary issues
    // Input is "YYYY-MM-DD" string from date picker
    const eventDate = new Date(date + 'T12:00:00Z')
    const deadlineDate = optInDeadline ? new Date(optInDeadline + 'T12:00:00Z') : null

    // Check if event already exists for this date (compare date part only)
    const startOfDay = new Date(eventDate)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(eventDate)
    endOfDay.setUTCHours(23, 59, 59, 999)

    const existingEvent = await prisma.pickupEvent.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    if (existingEvent) {
      return NextResponse.json(
        { success: false, error: 'An event already exists for this date' },
        { status: 400 }
      )
    }

    const event = await prisma.pickupEvent.create({
      data: {
        date: eventDate,
        description: description || null,
        optInDeadline: deadlineDate,
      },
    })

    return NextResponse.json({
      success: true,
      data: event,
    })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create event' },
      { status: 500 }
    )
  }
}
