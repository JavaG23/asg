import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return { error: NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 }) }
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.isAdmin) {
    return { error: NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 }) }
  }
  return { user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth && auth.error) return auth.error

    const donors = await prisma.donor.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
          },
        },
        addresses: {
          include: {
            route: {
              select: {
                id: true,
                name: true,
                date: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate donation stats for each donor
    const donorsWithStats = donors.map((donor) => {
      const totalDonations = donor.addresses.length
      const completedDonations = donor.addresses.filter(
        (addr) => addr.status === 'completed'
      ).length
      const uniqueEvents = new Set(
        donor.addresses.map((addr) => addr.route.date.toISOString().split('T')[0])
      ).size

      return {
        id: donor.id,
        name: donor.name,
        email: donor.email,
        phone: donor.phone,
        userId: donor.userId,
        linkedUser: donor.user,
        createdAt: donor.createdAt,
        updatedAt: donor.updatedAt,
        stats: {
          totalDonations,
          completedDonations,
          uniqueEvents,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: donorsWithStats,
    })
  } catch (error) {
    console.error('Error fetching donors:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch donors' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth && auth.error) return auth.error

    const body = await request.json()
    const { name, email, phone, userId } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate email
    if (email) {
      const existingDonor = await prisma.donor.findUnique({
        where: { email: email.toLowerCase() },
      })
      if (existingDonor) {
        return NextResponse.json(
          { success: false, error: 'A donor with this email already exists' },
          { status: 400 }
        )
      }
    }

    const donor = await prisma.donor.create({
      data: {
        name,
        email: email?.toLowerCase() || null,
        phone: phone || null,
        userId: userId || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: donor,
    })
  } catch (error) {
    console.error('Error creating donor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create donor' },
      { status: 500 }
    )
  }
}
