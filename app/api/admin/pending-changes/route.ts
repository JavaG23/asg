import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import { logFieldChanges } from '@/lib/services/changelog'
import { geocodeAddress } from '@/lib/services/geocoding'

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

// Get all users with pending changes
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth && auth.error) return auth.error

    const users = await prisma.user.findMany({
      where: {
        pendingChanges: {
          not: null,
        },
      },
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
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Parse pending changes
    const usersWithParsedChanges = users.map((user) => ({
      ...user,
      pendingChanges: user.pendingChanges ? JSON.parse(user.pendingChanges) : null,
    }))

    return NextResponse.json({
      success: true,
      data: usersWithParsedChanges,
      count: users.length,
    })
  } catch (error) {
    console.error('Error fetching pending changes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending changes' },
      { status: 500 }
    )
  }
}

// Approve or reject pending changes
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth && auth.error) return auth.error

    const body = await request.json()
    const { userId, action, adminUserId } = body

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'userId and action are required' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.pendingChanges) {
      return NextResponse.json(
        { success: false, error: 'No pending changes for this user' },
        { status: 400 }
      )
    }

    const pendingChanges = JSON.parse(user.pendingChanges)

    if (action === 'approve') {
      // Apply the changes (65j: booleans allowed for role requests like isDriver)
      const updates: Record<string, string | null | number | boolean> = {}
      const oldValues: Record<string, string | null | boolean> = {}
      const newValues: Record<string, string | null | boolean> = {}

      for (const [field, change] of Object.entries(pendingChanges.changes)) {
        const typedChange = change as { old: string | null | boolean; new: string | null | boolean }
        updates[field] = typedChange.new
        oldValues[field] = typedChange.old
        newValues[field] = typedChange.new
      }

      // If home address changed, geocode it
      if (updates.homeStreet || updates.homeCity || updates.homeState || updates.homeZip) {
        const street = (updates.homeStreet as string) || user.homeStreet || ''
        const city = (updates.homeCity as string) || user.homeCity || ''
        const state = (updates.homeState as string) || user.homeState || ''
        const zip = (updates.homeZip as string) || user.homeZip || ''

        if (street && city && state) {
          const coords = await geocodeAddress(street, city, state, zip)
          if (coords) {
            updates.homeLatitude = coords.latitude
            updates.homeLongitude = coords.longitude
          }
        }
      }

      // Clear pending changes and apply updates
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...updates,
          pendingChanges: null,
        },
      })

      // Log the approval
      const changes = Object.keys(newValues).map((field) => ({
        field,
        oldValue: oldValues[field],
        newValue: newValues[field],
      }))
      await logFieldChanges({
        userId: adminUserId || null,
        entityType: 'user',
        entityId: userId,
        entityName: user.name,
        changes,
      })

      return NextResponse.json({
        success: true,
        message: 'Changes approved and applied',
        appliedChanges: pendingChanges.changes,
      })
    } else {
      // Reject - just clear the pending changes
      await prisma.user.update({
        where: { id: userId },
        data: {
          pendingChanges: null,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Changes rejected',
      })
    }
  } catch (error) {
    console.error('Error processing pending changes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process changes' },
      { status: 500 }
    )
  }
}
