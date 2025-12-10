import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * PUT /api/routes/[id]/reorder
 * Update the sequence order of addresses in a route
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can reorder routes
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const routeId = parseInt(params.id)

    if (isNaN(routeId)) {
      return NextResponse.json(
        { error: 'Invalid route ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { addressIds } = body

    // Validate input
    if (!Array.isArray(addressIds) || addressIds.length === 0) {
      return NextResponse.json(
        { error: 'addressIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Verify all addresses belong to this route
    const addresses = await prisma.address.findMany({
      where: {
        routeId,
        id: { in: addressIds },
      },
    })

    if (addresses.length !== addressIds.length) {
      return NextResponse.json(
        { error: 'Some addresses do not belong to this route' },
        { status: 400 }
      )
    }

    // Update sequence order in a transaction
    await prisma.$transaction(
      addressIds.map((addressId, index) =>
        prisma.address.update({
          where: { id: addressId },
          data: { sequenceOrder: index + 1 },
        })
      )
    )

    // Fetch updated route with addresses
    const updatedRoute = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        addresses: {
          orderBy: {
            sequenceOrder: 'asc',
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      route: updatedRoute,
    })
  } catch (error) {
    console.error('Error reordering addresses:', error)
    return NextResponse.json(
      { error: 'Failed to reorder addresses' },
      { status: 500 }
    )
  }
}
