import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireVolunteer } from '@/lib/auth/guards'

// Volunteer portal build-out (#65)
// GET: active opportunity types + which ones this user has enabled.
// PUT: replace the user's enabled set (from onboarding or profile toggles).
//
// Preference convention: a user with ZERO preference rows sees ALL active
// types. Rows are only created once the user customizes their selection.

export async function GET() {
  try {
    const auth = await requireVolunteer()
    if ('error' in auth) return auth.error

    const [types, prefs] = await Promise.all([
      prisma.opportunityType.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.userOpportunityPreference.findMany({
        where: { userId: auth.user.id },
        select: { opportunityTypeId: true },
      }),
    ])

    const enabledIds = prefs.map((p) => p.opportunityTypeId)

    return NextResponse.json({
      success: true,
      data: {
        types: types.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          description: t.description,
          imageUrl: t.imageUrl,
          iconUrl: t.iconUrl,
          managerName: t.managerName,
          managerPhone: t.managerPhone,
          hasManager: Boolean(t.managerEmail),
          kind: t.kind,
          // zero rows = everything enabled (opt-out model)
          enabled: enabledIds.length === 0 || enabledIds.includes(t.id),
        })),
        hasCustomized: enabledIds.length > 0,
      },
    })
  } catch (error) {
    console.error('Error fetching opportunity types:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch opportunity types' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireVolunteer()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const enabledIds: unknown = body.enabledTypeIds

    if (!Array.isArray(enabledIds) || !enabledIds.every((id) => Number.isInteger(id))) {
      return NextResponse.json(
        { success: false, error: 'enabledTypeIds must be an array of ids' },
        { status: 400 }
      )
    }

    // Replace the user's preference set atomically
    await prisma.$transaction([
      prisma.userOpportunityPreference.deleteMany({ where: { userId: auth.user.id } }),
      prisma.userOpportunityPreference.createMany({
        data: (enabledIds as number[]).map((opportunityTypeId) => ({
          userId: auth.user.id,
          opportunityTypeId,
        })),
        skipDuplicates: true,
      }),
    ])

    return NextResponse.json({ success: true, data: { enabledTypeIds: enabledIds } })
  } catch (error) {
    console.error('Error updating opportunity preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
