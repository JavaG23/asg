import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/reports/addresses
 * Get list of all unique addresses with delivery statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access reports
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all addresses with delivery counts
    const addresses = await prisma.address.findMany({
      select: {
        id: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true,
        specialInstructions: true,
        _count: {
          select: {
            deliveryLogs: true,
          },
        },
      },
      orderBy: { streetAddress: 'asc' },
    })

    // Transform data
    const addressesWithStats = addresses.map((address) => ({
      id: address.id,
      streetAddress: address.streetAddress,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      specialInstructions: address.specialInstructions,
      timesDelivered: address._count.deliveryLogs,
    }))

    return NextResponse.json({
      success: true,
      data: addressesWithStats,
    })
  } catch (error) {
    console.error('Error fetching addresses report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch addresses report' },
      { status: 500 }
    )
  }
}
