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

    // Get all past opt-ins (where event date has passed)
    const history = await prisma.donorEventOptIn.findMany({
      where: {
        donorId: user.donor.id,
        event: {
          date: {
            lt: new Date(),
          },
        },
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

    return NextResponse.json({
      success: true,
      data: history.map((record) => ({
        id: record.id,
        date: record.event.date.toISOString(),
        status: record.status === 'opted_in' ? 'completed' : record.status,
        notes: record.cancelReason,
      })),
    })
  } catch (error) {
    console.error('Error fetching donor history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
