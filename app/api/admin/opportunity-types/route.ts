import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireAdmin } from '@/lib/auth/guards'

// Volunteer portal build-out (#65): admin CRUD for opportunity types.

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const types = await prisma.opportunityType.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { shifts: true, templates: true, userPreferences: true } },
      },
    })

    return NextResponse.json({ success: true, data: types })
  } catch (error) {
    console.error('Error fetching opportunity types:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch opportunity types' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const kind = ['shifts', 'routes', 'self-reported', 'registration'].includes(body.kind)
      ? body.kind
      : 'shifts'

    const type = await prisma.opportunityType.create({
      data: {
        name,
        slug: body.slug ? slugify(body.slug) : slugify(name),
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        iconUrl: body.iconUrl || null,
        managerName: body.managerName || null,
        managerEmail: body.managerEmail || null,
        managerPhone: body.managerPhone || null,
        kind,
        maxConcurrentSignups: Number.isInteger(Number(body.maxConcurrentSignups)) && Number(body.maxConcurrentSignups) > 0
          ? Number(body.maxConcurrentSignups)
          : null,
        active: body.active !== false,
        sortOrder: Number.isInteger(body.sortOrder) ? body.sortOrder : 0,
      },
    })

    return NextResponse.json({ success: true, data: type }, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An opportunity type with that name or slug already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating opportunity type:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create opportunity type' },
      { status: 500 }
    )
  }
}
