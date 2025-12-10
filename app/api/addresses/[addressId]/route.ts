import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * PUT /api/addresses/[addressId]
 * Update address information
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { addressId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update addresses
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const addressId = parseInt(params.addressId)

    if (isNaN(addressId)) {
      return NextResponse.json(
        { error: 'Invalid address ID' },
        { status: 400 }
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

    // Update the address
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: {
        streetAddress,
        city,
        state,
        zipCode,
        specialInstructions: specialInstructions || null,
      },
    })

    return NextResponse.json({
      success: true,
      address: updatedAddress,
    })
  } catch (error) {
    console.error('Error updating address:', error)

    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update address' },
      { status: 500 }
    )
  }
}
