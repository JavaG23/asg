import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireAdmin } from '@/lib/auth/guards'

// Volunteer portal build-out (#65): update/deactivate a recurring shift template.
// Editing a template does NOT retroactively change already-generated shifts;
// admins edit individual shifts via the existing /admin/shifts pages.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { id } = await params
    const templateId = parseInt(id, 10)
    const body = await request.json()

    if (body.daysOfWeek !== undefined) {
      if (
        !Array.isArray(body.daysOfWeek) ||
        !body.daysOfWeek.every((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
      ) {
        return NextResponse.json(
          { success: false, error: 'daysOfWeek must be an array of weekday numbers 0-6' },
          { status: 400 }
        )
      }
    }

    const template = await prisma.recurringShiftTemplate.update({
      where: { id: templateId },
      data: {
        ...(body.opportunityTypeId !== undefined && { opportunityTypeId: Number(body.opportunityTypeId) }),
        ...(body.frequency !== undefined && { frequency: body.frequency }),
        ...(body.daysOfWeek !== undefined && { daysOfWeek: JSON.stringify(body.daysOfWeek) }),
        ...(body.startTime !== undefined && { startTime: body.startTime }),
        ...(body.endTime !== undefined && { endTime: body.endTime }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.spotsNeeded !== undefined && { spotsNeeded: Number(body.spotsNeeded) }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.generateDaysAhead !== undefined && { generateDaysAhead: Number(body.generateDaysAhead) }),
        ...(body.active !== undefined && { active: Boolean(body.active) }),
      },
      include: { opportunityType: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: template })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Recurring schedule not found' },
        { status: 404 }
      )
    }
    console.error('Error updating recurring shift template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update recurring schedule' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { id } = await params
    const templateId = parseInt(id, 10)

    // Deactivate rather than delete; generated shifts keep their templateId
    // (relation is SetNull on delete, but deactivation preserves history).
    const template = await prisma.recurringShiftTemplate.update({
      where: { id: templateId },
      data: { active: false },
    })

    return NextResponse.json({ success: true, data: template })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Recurring schedule not found' },
        { status: 404 }
      )
    }
    console.error('Error deactivating recurring shift template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate recurring schedule' },
      { status: 500 }
    )
  }
}
