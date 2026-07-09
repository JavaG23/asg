import { redirect } from 'next/navigation'

// 65j: the shifts list now lives in the Volunteers hub as the
// "Scheduled Opportunities" tab. The per-shift detail page
// (/admin/shifts/[id]) is still used for signup approval.
export default function AdminShiftsPage() {
  redirect('/admin/volunteers?tab=schedule')
}
