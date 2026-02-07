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
        donor: {
          include: {
            addresses: {
              orderBy: { id: 'desc' },
              take: 1,
            },
            eventOptIns: {
              where: {
                status: 'opted_in',
                event: {
                  date: {
                    gte: new Date(),
                  },
                },
              },
              include: {
                event: true,
              },
              orderBy: {
                event: {
                  date: 'asc',
                },
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.isDonor || !user.donor) {
      return NextResponse.json(
        { success: false, error: 'User is not a donor' },
        { status: 403 }
      )
    }

    // Get donation history count (completed opt-ins)
    const completedDonations = await prisma.donorEventOptIn.count({
      where: {
        donorId: user.donor.id,
        status: 'completed',
      },
    })

    // Get last donation date
    const lastDonation = await prisma.donorEventOptIn.findFirst({
      where: {
        donorId: user.donor.id,
        status: 'completed',
      },
      include: {
        event: true,
      },
      orderBy: {
        event: {
          date: 'desc',
        },
      },
    })

    const address = user.donor.addresses[0]

    return NextResponse.json({
      success: true,
      data: {
        donor: {
          id: user.donor.id,
          name: user.donor.name,
          email: user.donor.email,
          address: address
            ? {
                streetAddress: address.streetAddress,
                city: address.city,
                state: address.state,
                zipCode: address.zipCode,
              }
            : null,
        },
        upcomingPickups: user.donor.eventOptIns.map((optIn) => ({
          id: optIn.id,
          date: optIn.event.date.toISOString(),
          status: optIn.status,
          reminderPreference: optIn.reminderPreference,
        })),
        totalDonations: completedDonations,
        lastDonationDate: lastDonation?.event.date.toISOString() || null,
      },
    })
  } catch (error) {
    console.error('Error fetching donor dashboard:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
