import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireVolunteer } from '@/lib/auth/guards'

// Volunteer portal build-out (#65)
// Calendar/list feed of upcoming volunteer opportunities (shifts), with
// the user's signup status attached and optional opportunity-type filter.
// Query params:
//   typeId  - filter to one opportunity type
//   from,to - ISO date range (defaults: today .. +60 days)
//   mine    - "1" to return only shifts the user is signed up for

export async function GET(request: NextRequest) {
  try {
    const auth = await requireVolunteer()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const typeId = searchParams.get('typeId')
    const mine = searchParams.get('mine') === '1'
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date()
    const to = searchParams.get('to')
      ? new Date(searchParams.get('to')!)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

    // Respect the user's opportunity-type preferences (zero rows = all types)
    const prefs = await prisma.userOpportunityPreference.findMany({
      where: { userId: auth.user.id },
      select: { opportunityTypeId: true },
    })
    const preferredIds = prefs.map((p) => p.opportunityTypeId)

    const shifts = await prisma.volunteerShift.findMany({
      where: {
        date: { gte: from, lte: to },
        ...(typeId
          ? { opportunityTypeId: parseInt(typeId, 10) }
          : preferredIds.length > 0
          ? { OR: [{ opportunityTypeId: { in: preferredIds } }, { opportunityTypeId: null }] }
          : {}),
        ...(mine ? { signups: { some: { userId: auth.user.id, status: { not: 'cancelled' } } } } : {}),
      },
      include: {
        opportunityType: { select: { id: true, name: true, slug: true, imageUrl: true, kind: true } },
        signups: { select: { userId: true, status: true } },
      },
      orderBy: { date: 'asc' },
    })

    // 65j: for routes-kind shifts, look up the user's assigned route per date
    // so My Opportunities can deep-link to the driver portal
    const hasRouteShifts = shifts.some((s) => s.opportunityType?.kind === 'routes')
    const myRoutes = hasRouteShifts
      ? await prisma.route.findMany({
          where: { driverId: auth.user.id, date: { gte: from, lte: to } },
          select: { id: true, name: true, date: true, status: true },
        })
      : []

    const data = shifts.map((shift) => {
      const approvedCount = shift.signups.filter((s) => s.status === 'approved').length
      const userSignup = shift.signups.find((s) => s.userId === auth.user.id)
      const assignedRoute =
        shift.opportunityType?.kind === 'routes'
          ? myRoutes.find((r) => r.date.toDateString() === shift.date.toDateString()) ?? null
          : null
      return {
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.location,
        notes: shift.notes,
        spotsNeeded: shift.spotsNeeded,
        spotsAvailable: Math.max(0, shift.spotsNeeded - approvedCount),
        opportunityType: shift.opportunityType,
        userStatus: userSignup?.status ?? 'none',
        assignedRoute: assignedRoute
          ? { id: assignedRoute.id, name: assignedRoute.name, status: assignedRoute.status }
          : null,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch opportunities' },
      { status: 500 }
    )
  }
}
