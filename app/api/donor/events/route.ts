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

    // Get all upcoming pickup events
    const events = await prisma.pickupEvent.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      include: {
        optIns: {
          where: {
            donorId: user.donor.id,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    const now = new Date()

    return NextResponse.json({
      success: true,
      data: events.map((event) => {
        const optIn = event.optIns[0]
        const canOptIn = !event.optInDeadline || new Date(event.optInDeadline) > now

        return {
          id: event.id,
          date: event.date.toISOString(),
          description: event.description,
          optInDeadline: event.optInDeadline?.toISOString() || null,
          optedIn: optIn?.status === 'opted_in',
          reminderPreference: optIn?.reminderPreference || null,
          canOptIn,
        }
      }),
    })
  } catch (error) {
    console.error('Error fetching donor events:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
