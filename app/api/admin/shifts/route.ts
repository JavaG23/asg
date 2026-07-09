import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireAdmin } from '@/lib/auth/guards'

// P2021 = table missing, P2022 = column missing. The volunteer portal tables
// (#36/#65) are pending the deferred migration on the shared prod/dev DB, so
// surface that clearly instead of a generic failure (task 65e).
function missingTableResponse(error: unknown): NextResponse | null {
  const code = (error as { code?: string })?.code
  if (code === 'P2021' || code === 'P2022') {
    return NextResponse.json(
      {
        success: false,
        error:
          'Volunteer shift tables are not in the database yet — the schema migration is deferred until production testing is complete (see docs/volunteer-portal-buildout.md).',
      },
      { status: 503 }
    )
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const shifts = await prisma.volunteerShift.findMany({
      include: {
        signups: {
          select: {
            status: true,
          },
        },
        opportunityType: {
          select: { id: true, name: true, kind: true },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: shifts.map((shift) => ({
        id: shift.id,
        date: shift.date.toISOString(),
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.location,
        spotsNeeded: shift.spotsNeeded,
        notes: shift.notes,
        opportunityType: shift.opportunityType,
        spotsManuallySet: shift.spotsManuallySet,
        signupCounts: {
          pending: shift.signups.filter((s) => s.status === 'pending').length,
          approved: shift.signups.filter((s) => s.status === 'approved').length,
          waitlisted: shift.signups.filter((s) => s.status === 'waitlisted').length,
        },
      })),
    })
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return (
      missingTableResponse(error) ??
      NextResponse.json({ success: false, error: 'Failed to fetch shifts' }, { status: 500 })
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const { date, startTime, endTime, location, spotsNeeded, notes, opportunityTypeId } = body

    if (!date || !startTime || !endTime || !location || !spotsNeeded) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Parse date at noon UTC to avoid timezone day-boundary issues
    const shiftDate = new Date(date + 'T12:00:00Z')

    const shift = await prisma.volunteerShift.create({
      data: {
        date: shiftDate,
        startTime,
        endTime,
        location,
        spotsNeeded: parseInt(spotsNeeded),
        notes: notes || null,
        opportunityTypeId: opportunityTypeId ? parseInt(opportunityTypeId) : null,
        // 65j: admin-created shifts are manually set — the driver-routes sync
        // never overrides their spotsNeeded (pre-planning scenario)
        spotsManuallySet: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: shift,
    })
  } catch (error) {
    console.error('Error creating shift:', error)
    return (
      missingTableResponse(error) ??
      NextResponse.json({ success: false, error: 'Failed to create shift' }, { status: 500 })
    )
  }
}
