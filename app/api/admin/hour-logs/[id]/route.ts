import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireAdmin } from '@/lib/auth/guards'

// 65j: admin verifies (or un-verifies) a volunteer hour log.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { id } = await params
    const logId = parseInt(id, 10)
    const body = await request.json()
    const verified = Boolean(body.verified)

    const log = await prisma.volunteerHourLog.update({
      where: { id: logId },
      data: {
        verified,
        verifiedById: verified ? auth.user.id : null,
        verifiedAt: verified ? new Date() : null,
      },
      include: {
        user: { select: { id: true, name: true } },
        opportunityType: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: log })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Hour log not found' },
        { status: 404 }
      )
    }
    console.error('Error verifying hour log:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update hour log' },
      { status: 500 }
    )
  }
}
