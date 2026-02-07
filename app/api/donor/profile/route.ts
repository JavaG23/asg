import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import { logChange } from '@/lib/services/changelog'

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
      include: {
        donor: {
          include: {
            addresses: {
              orderBy: { id: 'desc' },
              take: 1,
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

    // Parse pending changes if they exist
    let pendingChanges = null
    if (user.pendingChanges) {
      try {
        pendingChanges = JSON.parse(user.pendingChanges)
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    const address = user.donor.addresses[0]

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.donor.name,
        email: user.donor.email,
        phone: user.donor.phone,
        address: address
          ? {
              streetAddress: address.streetAddress,
              city: address.city,
              state: address.state,
              zipCode: address.zipCode,
            }
          : null,
        pendingChanges,
      },
    })
  } catch (error) {
    console.error('Error fetching donor profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
      include: {
        donor: {
          include: {
            addresses: {
              orderBy: { id: 'desc' },
              take: 1,
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

    const body = await request.json()
    const { phone, streetAddress, city, state, zipCode } = body

    const currentAddress = user.donor.addresses[0]

    // Build pending changes object (only include fields that changed)
    const changes: Record<string, { old: string | null; new: string | null }> = {}

    if (phone !== undefined && phone !== user.donor.phone) {
      changes.phone = { old: user.donor.phone, new: phone || null }
    }
    if (streetAddress !== undefined && streetAddress !== currentAddress?.streetAddress) {
      changes.streetAddress = { old: currentAddress?.streetAddress || null, new: streetAddress || null }
    }
    if (city !== undefined && city !== currentAddress?.city) {
      changes.city = { old: currentAddress?.city || null, new: city || null }
    }
    if (state !== undefined && state !== currentAddress?.state) {
      changes.state = { old: currentAddress?.state || null, new: state || null }
    }
    if (zipCode !== undefined && zipCode !== currentAddress?.zipCode) {
      changes.zipCode = { old: currentAddress?.zipCode || null, new: zipCode || null }
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
      })
    }

    // Store pending changes
    const pendingChanges = {
      submittedAt: new Date().toISOString(),
      changes,
      donorId: user.donor.id,
      addressId: currentAddress?.id || null,
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingChanges: JSON.stringify(pendingChanges),
      },
    })

    // Log the change request
    await logChange({
      userId: user.id,
      action: 'create',
      entityType: 'donor',
      entityId: user.donor.id,
      entityName: user.donor.name,
      field: 'pendingChanges',
      oldValue: null,
      newValue: { type: 'donor_profile_change_request', changes },
      metadata: { source: 'donor_self_edit' },
    })

    return NextResponse.json({
      success: true,
      message: 'Profile changes submitted for approval',
      pendingChanges,
    })
  } catch (error) {
    console.error('Error submitting donor profile changes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit changes' },
      { status: 500 }
    )
  }
}

// Cancel pending changes
export async function DELETE(request: NextRequest) {
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingChanges: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Pending changes cancelled',
    })
  } catch (error) {
    console.error('Error cancelling changes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel changes' },
      { status: 500 }
    )
  }
}
