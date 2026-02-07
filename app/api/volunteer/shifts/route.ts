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

    // Get all upcoming shifts
    const shifts = await prisma.volunteerShift.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      include: {
        signups: {
          where: {
            status: { in: ['pending', 'approved', 'waitlisted'] },
          },
        },
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
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: shifts.map((shift) => {
        const userSignup = shift.signups.find((s) => s.userId === user.id)
        const approvedCount = shift._count.signups

        return {
          id: shift.id,
          date: shift.date.toISOString(),
          startTime: shift.startTime,
          endTime: shift.endTime,
          location: shift.location,
          spotsNeeded: shift.spotsNeeded,
          spotsAvailable: Math.max(0, shift.spotsNeeded - approvedCount),
          notes: shift.notes,
          userStatus: userSignup?.status || 'none',
        }
      }),
    })
  } catch (error) {
    console.error('Error fetching volunteer shifts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}
