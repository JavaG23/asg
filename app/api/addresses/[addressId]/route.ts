import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import { logFieldChanges, logChange } from '@/lib/services/changelog'

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
    if (!(session.user as any).isAdmin) {
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
    const { streetAddress, city, state, zipCode, specialInstructions, donorName, donorEmail, donorPhone } = body

    // Validate required fields
    if (!streetAddress || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Street address, city, state, and zip code are required' },
        { status: 400 }
      )
    }

    // Get original address for logging
    const originalAddress = await prisma.address.findUnique({
      where: { id: addressId },
      select: { streetAddress: true, city: true, state: true, zipCode: true, specialInstructions: true, donorName: true, donorEmail: true, donorPhone: true },
    })

    // Update the address
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: {
        streetAddress,
        city,
        state,
        zipCode,
        specialInstructions: specialInstructions || null,
        donorName: donorName || null,
        donorEmail: donorEmail || null,
        donorPhone: donorPhone || null,
      },
    })

    // Log changes
    if (originalAddress) {
      const userId = parseInt((session.user as any).id)
      const userName = (session.user as any).name
      await logFieldChanges({
        userId,
        userName,
        entityType: 'address',
        entityId: addressId,
        entityName: updatedAddress.streetAddress,
        changes: [
          { field: 'streetAddress', oldValue: originalAddress.streetAddress, newValue: updatedAddress.streetAddress },
          { field: 'city', oldValue: originalAddress.city, newValue: updatedAddress.city },
          { field: 'state', oldValue: originalAddress.state, newValue: updatedAddress.state },
          { field: 'zipCode', oldValue: originalAddress.zipCode, newValue: updatedAddress.zipCode },
          { field: 'specialInstructions', oldValue: originalAddress.specialInstructions, newValue: updatedAddress.specialInstructions },
          { field: 'donorName', oldValue: originalAddress.donorName, newValue: updatedAddress.donorName },
          { field: 'donorEmail', oldValue: originalAddress.donorEmail, newValue: updatedAddress.donorEmail },
          { field: 'donorPhone', oldValue: originalAddress.donorPhone, newValue: updatedAddress.donorPhone },
        ],
      })
    }

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

/**
 * DELETE /api/addresses/[addressId]
 * Delete an address from a route
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { addressId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete addresses
    if (!(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const addressId = parseInt(params.addressId)

    if (isNaN(addressId)) {
      return NextResponse.json(
        { error: 'Invalid address ID' },
        { status: 400 }
      )
    }

    // Get the address to find its route and for logging
    const address = await prisma.address.findUnique({
      where: { id: addressId },
      select: { routeId: true, sequenceOrder: true, streetAddress: true },
    })

    if (!address) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      )
    }

    // Delete associated delivery logs first
    await prisma.deliveryLog.deleteMany({
      where: { addressId },
    })

    // Delete the address
    await prisma.address.delete({
      where: { id: addressId },
    })

    // Resequence remaining addresses
    const remainingAddresses = await prisma.address.findMany({
      where: { routeId: address.routeId },
      orderBy: { sequenceOrder: 'asc' },
    })

    // Update sequence orders
    for (let i = 0; i < remainingAddresses.length; i++) {
      if (remainingAddresses[i].sequenceOrder !== i + 1) {
        await prisma.address.update({
          where: { id: remainingAddresses[i].id },
          data: { sequenceOrder: i + 1 },
        })
      }
    }

    // Log the deletion
    const userId = parseInt((session.user as any).id)
    const userName = (session.user as any).name
    await logChange({
      userId,
      userName,
      action: 'delete',
      entityType: 'address',
      entityId: addressId,
      entityName: address.streetAddress,
    })

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting address:', error)

    return NextResponse.json(
      { error: 'Failed to delete address' },
      { status: 500 }
    )
  }
}
