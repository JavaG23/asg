import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireAdmin } from '@/lib/auth/guards'

// 65j: admin advances a registration's status (pending -> confirmed ->
// completed, or cancelled).

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { id } = await params
    const registrationId = parseInt(id, 10)
    const body = await request.json()

    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const registration = await prisma.opportunityRegistration.update({
      where: { id: registrationId },
      data: { status: body.status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        opportunityType: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: registration })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Registration not found' },
        { status: 404 }
      )
    }
    console.error('Error updating registration:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update registration' },
      { status: 500 }
    )
  }
}
