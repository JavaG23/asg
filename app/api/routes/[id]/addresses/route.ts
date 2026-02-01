import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import { logChange } from '@/lib/services/changelog'

/**
 * POST /api/routes/[id]/addresses
 * Add a new address to a route
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can add addresses
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

    // Check route exists
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        addresses: {
          orderBy: { sequenceOrder: 'desc' },
          take: 1,
        },
      },
    })

    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { streetAddress, city, state, zipCode, specialInstructions } = body

    // Validate required fields
    if (!streetAddress || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Street address, city, state, and zip code are required' },
        { status: 400 }
      )
    }

    // Get the next sequence order
    const lastSequence = route.addresses[0]?.sequenceOrder || 0
    const newSequenceOrder = lastSequence + 1

    // Create the new address
    const newAddress = await prisma.address.create({
      data: {
        routeId,
        streetAddress,
        city,
        state,
        zipCode,
        specialInstructions: specialInstructions || null,
        sequenceOrder: newSequenceOrder,
        status: 'pending',
      },
    })

    // Log the creation
    const userId = parseInt((session.user as any).id)
    const userName = (session.user as any).name
    await logChange({
      userId,
      userName,
      action: 'create',
      entityType: 'address',
      entityId: newAddress.id,
      entityName: newAddress.streetAddress,
      metadata: { routeId, routeName: route.name },
    })

    return NextResponse.json({
      success: true,
      address: newAddress,
      message: 'Address added successfully',
    })
  } catch (error) {
    console.error('Error adding address:', error)

    return NextResponse.json(
      { error: 'Failed to add address' },
      { status: 500 }
    )
  }
}
