import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { generateShiftsFromTemplates } from '@/lib/services/recurring-shifts'

// Volunteer portal build-out (#65): expand active recurring templates into
// VolunteerShift rows ("Generate Upcoming Shifts" button in /admin/volunteers).
// Idempotent — safe to run repeatedly. Future: also wire as a daily cron in
// vercel.json (mirror /api/cron/pickup-reminders with CRON_SECRET check).

export async function POST() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const result = await generateShiftsFromTemplates()

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error generating shifts from templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate shifts' },
      { status: 500 }
    )
  }
}
