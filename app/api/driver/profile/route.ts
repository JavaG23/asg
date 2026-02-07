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
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        homeStreet: true,
        homeCity: true,
        homeState: true,
        homeZip: true,
        pendingChanges: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
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

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        pendingChanges,
      },
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
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
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { phone, homeStreet, homeCity, homeState, homeZip } = body

    // Build pending changes object (only include fields that changed)
    const changes: Record<string, { old: string | null; new: string | null }> = {}

    if (phone !== undefined && phone !== user.phone) {
      changes.phone = { old: user.phone, new: phone || null }
    }
    if (homeStreet !== undefined && homeStreet !== user.homeStreet) {
      changes.homeStreet = { old: user.homeStreet, new: homeStreet || null }
    }
    if (homeCity !== undefined && homeCity !== user.homeCity) {
      changes.homeCity = { old: user.homeCity, new: homeCity || null }
    }
    if (homeState !== undefined && homeState !== user.homeState) {
      changes.homeState = { old: user.homeState, new: homeState || null }
    }
    if (homeZip !== undefined && homeZip !== user.homeZip) {
      changes.homeZip = { old: user.homeZip, new: homeZip || null }
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        data: user,
      })
    }

    // Store pending changes
    const pendingChanges = {
      submittedAt: new Date().toISOString(),
      changes,
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
      entityType: 'user',
      entityId: user.id,
      entityName: user.name,
      field: 'pendingChanges',
      oldValue: null,
      newValue: { type: 'profile_change_request', changes },
      metadata: { source: 'driver_self_edit' },
    })

    return NextResponse.json({
      success: true,
      message: 'Profile changes submitted for approval',
      pendingChanges,
    })
  } catch (error) {
    console.error('Error submitting profile changes:', error)
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
