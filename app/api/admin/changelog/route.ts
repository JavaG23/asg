import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getChangeLogs, EntityType, ChangeAction } from '@/lib/services/changelog'

/**
 * GET /api/admin/changelog
 * Fetch change logs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view change logs
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('entityType') as EntityType | null
    const entityId = searchParams.get('entityId')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action') as ChangeAction | null
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const result = await getChangeLogs({
      entityType: entityType || undefined,
      entityId: entityId ? parseInt(entityId) : undefined,
      userId: userId ? parseInt(userId) : undefined,
      action: action || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    })

    return NextResponse.json({
      success: true,
      data: result.logs,
      total: result.total,
    })
  } catch (error) {
    console.error('Error fetching change logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch change logs' },
      { status: 500 }
    )
  }
}
