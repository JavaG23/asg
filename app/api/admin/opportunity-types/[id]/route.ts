import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireAdmin } from '@/lib/auth/guards'

// Volunteer portal build-out (#65): update/deactivate a single opportunity type.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { id } = await params
    const typeId = parseInt(id, 10)
    const body = await request.json()

    // 65j: system-managed types (Driver Routes) keep their kind locked
    const existing = await prisma.opportunityType.findUnique({ where: { id: typeId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Opportunity type not found' },
        { status: 404 }
      )
    }
    const kindUpdate =
      body.kind !== undefined &&
      !existing.systemManaged &&
      ['shifts', 'routes', 'self-reported', 'registration'].includes(body.kind)
        ? { kind: body.kind }
        : {}

    const type = await prisma.opportunityType.update({
      where: { id: typeId },
      data: {
        ...(body.name !== undefined && { name: String(body.name).trim() }),
        ...(body.slug !== undefined && { slug: String(body.slug).trim() }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
        ...(body.managerName !== undefined && { managerName: body.managerName || null }),
        ...(body.managerEmail !== undefined && { managerEmail: body.managerEmail || null }),
        ...(body.managerPhone !== undefined && { managerPhone: body.managerPhone || null }),
        ...kindUpdate,
        ...(body.maxConcurrentSignups !== undefined && {
          maxConcurrentSignups:
            Number(body.maxConcurrentSignups) > 0 ? Number(body.maxConcurrentSignups) : null,
        }),
        ...(body.active !== undefined && { active: Boolean(body.active) }),
        ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) || 0 }),
      },
    })

    return NextResponse.json({ success: true, data: type })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Opportunity type not found' },
        { status: 404 }
      )
    }
    console.error('Error updating opportunity type:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update opportunity type' },
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
    const typeId = parseInt(id, 10)

    // Soft-delete: deactivate rather than delete so historical shifts and
    // hour logs keep their categorization. Hard delete only if never used.
    const usage = await prisma.opportunityType.findUnique({
      where: { id: typeId },
      include: { _count: { select: { shifts: true, templates: true } } },
    })

    if (!usage) {
      return NextResponse.json(
        { success: false, error: 'Opportunity type not found' },
        { status: 404 }
      )
    }

    // 65j: system-managed types (Driver Routes) can't be removed — their
    // lifecycle is owned by the routes sync. Hide them via active toggle only.
    if (usage.systemManaged) {
      return NextResponse.json(
        { success: false, error: 'This opportunity type is system-managed and cannot be removed. You can hide it by unchecking "Visible to volunteers" instead.' },
        { status: 400 }
      )
    }

    if (usage._count.shifts > 0 || usage._count.templates > 0) {
      await prisma.opportunityType.update({
        where: { id: typeId },
        data: { active: false },
      })
      return NextResponse.json({
        success: true,
        data: { deactivated: true, deleted: false },
      })
    }

    await prisma.opportunityType.delete({ where: { id: typeId } })
    return NextResponse.json({ success: true, data: { deactivated: false, deleted: true } })
  } catch (error) {
    console.error('Error deleting opportunity type:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete opportunity type' },
      { status: 500 }
    )
  }
}
