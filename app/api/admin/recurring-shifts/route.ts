import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireAdmin } from '@/lib/auth/guards'

// Volunteer portal build-out (#65): admin CRUD for recurring shift templates.
// A template describes "Distribution: every Tue/Thu 09:00-12:00, 6 volunteers"
// and is expanded into VolunteerShift rows by /api/admin/recurring-shifts/generate.

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const templates = await prisma.recurringShiftTemplate.findMany({
      include: {
        opportunityType: { select: { id: true, name: true, slug: true } },
        _count: { select: { shifts: true } },
      },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    console.error('Error fetching recurring shift templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recurring schedules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const opportunityTypeId = Number(body.opportunityTypeId)
    const daysOfWeek: unknown = body.daysOfWeek

    if (!Number.isInteger(opportunityTypeId)) {
      return NextResponse.json(
        { success: false, error: 'opportunityTypeId is required' },
        { status: 400 }
      )
    }
    if (
      !Array.isArray(daysOfWeek) ||
      daysOfWeek.length === 0 ||
      !daysOfWeek.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    ) {
      return NextResponse.json(
        { success: false, error: 'daysOfWeek must be an array of weekday numbers 0-6' },
        { status: 400 }
      )
    }
    if (!body.startTime || !body.endTime || !body.startDate || !Number.isInteger(Number(body.spotsNeeded))) {
      return NextResponse.json(
        { success: false, error: 'startTime, endTime, startDate, and spotsNeeded are required' },
        { status: 400 }
      )
    }

    const template = await prisma.recurringShiftTemplate.create({
      data: {
        opportunityTypeId,
        frequency: ['weekly', 'biweekly', 'monthly'].includes(body.frequency) ? body.frequency : 'weekly',
        daysOfWeek: JSON.stringify(daysOfWeek),
        startTime: body.startTime,
        endTime: body.endTime,
        location: body.location || 'Distribution Center',
        spotsNeeded: Number(body.spotsNeeded),
        notes: body.notes || null,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        generateDaysAhead: Number.isInteger(Number(body.generateDaysAhead))
          ? Number(body.generateDaysAhead)
          : 28,
        active: body.active !== false,
      },
      include: { opportunityType: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (error) {
    console.error('Error creating recurring shift template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create recurring schedule' },
      { status: 500 }
    )
  }
}
