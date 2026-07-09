import { NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireVolunteer } from '@/lib/auth/guards'

// 65j: a volunteer without the driver role who wants to sign up for Driver
// Routes requests driver access here. Reuses the existing pendingChanges
// approval mechanism (#30) — the request appears on the admin
// /admin/pending-changes page as isDriver: false -> true.

export async function POST() {
  try {
    const auth = await requireVolunteer()
    if ('error' in auth) return auth.error

    if (auth.user.isDriver) {
      return NextResponse.json(
        { success: false, error: 'You already have the driver role' },
        { status: 400 }
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { pendingChanges: true },
    })

    // Merge with any pending profile changes instead of overwriting them
    let existing: { submittedAt?: string; changes: Record<string, { old: unknown; new: unknown }> } = {
      changes: {},
    }
    if (dbUser?.pendingChanges) {
      try {
        existing = JSON.parse(dbUser.pendingChanges)
        existing.changes = existing.changes || {}
      } catch {
        existing = { changes: {} }
      }
    }

    if (existing.changes.isDriver) {
      return NextResponse.json({
        success: true,
        message: 'Driver access request already pending',
        data: { alreadyRequested: true },
      })
    }

    existing.changes.isDriver = { old: false, new: true }
    existing.submittedAt = new Date().toISOString()

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { pendingChanges: JSON.stringify(existing) },
    })

    return NextResponse.json({
      success: true,
      message: 'Driver access requested — an admin will review it shortly',
      data: { alreadyRequested: false },
    })
  } catch (error) {
    console.error('Error requesting driver role:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to request driver access' },
      { status: 500 }
    )
  }
}

// GET: has this user already requested driver access?
export async function GET() {
  try {
    const auth = await requireVolunteer()
    if ('error' in auth) return auth.error

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { pendingChanges: true },
    })

    let requested = false
    if (dbUser?.pendingChanges) {
      try {
        requested = Boolean(JSON.parse(dbUser.pendingChanges)?.changes?.isDriver)
      } catch {
        requested = false
      }
    }

    return NextResponse.json({
      success: true,
      data: { isDriver: auth.user.isDriver, requested },
    })
  } catch (error) {
    console.error('Error checking driver role request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check driver access request' },
      { status: 500 }
    )
  }
}
