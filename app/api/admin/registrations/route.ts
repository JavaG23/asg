import { NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireAdmin } from '@/lib/auth/guards'

// 65j: admin list of community-partner registrations.

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const registrations = await prisma.opportunityRegistration.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        opportunityType: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { plannedDate: 'asc' }],
    })

    return NextResponse.json({ success: true, data: registrations })
  } catch (error) {
    console.error('Error fetching registrations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch registrations' },
      { status: 500 }
    )
  }
}
