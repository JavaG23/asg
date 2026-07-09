import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireAdmin } from '@/lib/auth/guards'

// 65j: admin review list of volunteer hour logs (manual self-reported
// entries first, unverified before verified).

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const onlyUnverified = searchParams.get('unverified') === '1'

    const logs = await prisma.volunteerHourLog.findMany({
      where: {
        ...(onlyUnverified ? { verified: false, source: 'manual' } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        opportunityType: { select: { id: true, name: true } },
      },
      orderBy: [{ verified: 'asc' }, { clockIn: 'desc' }],
      take: 200,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('Error fetching hour logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hour logs' },
      { status: 500 }
    )
  }
}
