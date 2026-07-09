'use client'

// 65j: the three data tabs of the admin Volunteers hub that live alongside
// Opportunity Types and Recurring Schedules (app/admin/volunteers/page.tsx):
//   - ScheduledOpportunitiesTab: all volunteer shifts (absorbs /admin/shifts)
//   - RegistrationsTab: community-partner registrations (food drives, kits)
//   - HourLogsTab: hour-log review + verification

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Calendar, Clock, Eye, MapPin, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'

interface TypeOption {
  id: number
  name: string
  kind: string
  active: boolean
}

// ============ Scheduled Opportunities ============

interface AdminShift {
  id: number
  date: string
  startTime: string
  endTime: string
  location: string
  spotsNeeded: number
  notes: string | null
  opportunityType: { id: number; name: string; kind: string } | null
  spotsManuallySet: boolean
  signupCounts: { pending: number; approved: number; waitlisted: number }
}

const emptyShiftForm = {
  date: '',
  startTime: '09:00',
  endTime: '12:00',
  location: 'Distribution Center',
  spotsNeeded: 5,
  notes: '',
  opportunityTypeId: '',
}

export function ScheduledOpportunitiesTab({ types }: { types: TypeOption[] }) {
  const router = useRouter()
  const [shifts, setShifts] = useState<AdminShift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...emptyShiftForm })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Manual shift creation: shifts + routes kinds (routes = pre-planning a
  // driver count before route data exists); not self-reported/registration.
  const creatableTypes = types.filter(
    (t) => t.active && ['shifts', 'routes'].includes(t.kind)
  )

  useEffect(() => {
    fetchShifts()
  }, [])

  const fetchShifts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/shifts')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch shifts')
      setShifts(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyShiftForm })
    setShowCreate(true)
  }

  const openEdit = (shift: AdminShift) => {
    setEditingId(shift.id)
    setForm({
      date: shift.date.slice(0, 10),
      startTime: shift.startTime,
      endTime: shift.endTime,
      location: shift.location,
      spotsNeeded: shift.spotsNeeded,
      notes: shift.notes || '',
      opportunityTypeId: shift.opportunityType ? String(shift.opportunityType.id) : '',
    })
    setShowCreate(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const url = editingId ? `/api/admin/shifts/${editingId}` : '/api/admin/shifts'
      const body = editingId
        ? {
            // date/type not editable after creation; spots edit marks manual
            spotsNeeded: form.spotsNeeded,
            startTime: form.startTime,
            endTime: form.endTime,
            location: form.location,
            notes: form.notes,
          }
        : form
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save shift')
      setShowCreate(false)
      await fetchShifts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save shift')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (shiftId: number) => {
    if (!confirm('Delete this shift? This also removes all signups.')) return
    setDeletingId(shiftId)
    try {
      const response = await fetch(`/api/admin/shifts/${shiftId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete shift')
      await fetchShifts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete shift')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <Loading text="Loading scheduled opportunities..." />

  const filtered = shifts.filter((s) => {
    if (typeFilter === 'all') return true
    if (typeFilter === 'none') return !s.opportunityType
    return s.opportunityType?.id === Number(typeFilter)
  })
  const upcoming = filtered.filter((s) => new Date(s.date) >= new Date())
  const past = filtered.filter((s) => new Date(s.date) < new Date())

  const renderShift = (shift: AdminShift, dim = false) => (
    <div key={shift.id} className={`card ${dim ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="font-semibold text-gray-900">
              {new Date(shift.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            {shift.opportunityType && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                {shift.opportunityType.name}
              </span>
            )}
            {shift.opportunityType?.kind === 'routes' && (
              <Link
                href="/admin/routes"
                className="text-xs text-primary-600 hover:text-primary-700 underline"
              >
                {shift.spotsManuallySet ? 'Pre-planned — manage routes' : 'Synced from routes'}
              </Link>
            )}
          </div>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {shift.startTime} - {shift.endTime}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {shift.location}
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {shift.signupCounts.approved}/{shift.spotsNeeded} filled
              {shift.signupCounts.pending > 0 && (
                <span className="text-yellow-600">({shift.signupCounts.pending} pending)</span>
              )}
              {shift.signupCounts.waitlisted > 0 && (
                <span className="text-gray-500">({shift.signupCounts.waitlisted} waitlisted)</span>
              )}
            </div>
          </div>
          {shift.notes && <p className="mt-2 text-sm text-gray-500 italic">{shift.notes}</p>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/shifts/${shift.id}`)}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openEdit(shift)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDelete(shift.id)}
            loading={deletingId === shift.id}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All opportunity types</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value="none">Generic (no type)</option>
        </select>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Create Shift
        </Button>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming</h3>
        {upcoming.length > 0 ? (
          <div className="grid gap-4">{upcoming.map((s) => renderShift(s))}</div>
        ) : (
          <div className="card text-center py-8 text-gray-500">No upcoming shifts</div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Past</h3>
          <div className="grid gap-4">{past.slice(0, 10).map((s) => renderShift(s, true))}</div>
        </section>
      )}

      {/* Create / Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {editingId ? 'Edit Shift' : 'Create New Shift'}
              </h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              {!editingId && creatableTypes.length > 0 && (
                <div>
                  <label className="label">Opportunity Type</label>
                  <select
                    className="input w-full"
                    value={form.opportunityTypeId}
                    onChange={(e) => setForm({ ...form, opportunityTypeId: e.target.value })}
                  >
                    <option value="">None (generic shift)</option>
                    {creatableTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.kind === 'routes' ? ' (pre-plan driver count)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!editingId && (
                <div>
                  <label className="label">Date *</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Time *</label>
                  <input
                    type="time"
                    className="input w-full"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">End Time *</label>
                  <input
                    type="time"
                    className="input w-full"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Location *</label>
                <input
                  className="input w-full"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Volunteers Needed *</label>
                <input
                  type="number"
                  min={1}
                  className="input w-full"
                  value={form.spotsNeeded}
                  onChange={(e) => setForm({ ...form, spotsNeeded: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special instructions for volunteers..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={save}
                loading={saving}
                disabled={!editingId && !form.date}
              >
                {editingId ? 'Save Changes' : 'Create Shift'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ Registrations ============

interface Registration {
  id: number
  plannedDate: string
  phone: string | null
  message: string | null
  status: string
  createdAt: string
  user: { id: number; name: string; email: string; phone: string | null }
  opportunityType: { id: number; name: string }
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export function RegistrationsTab() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/registrations')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch registrations')
      setRegistrations(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }

  const setStatus = async (id: number, status: string) => {
    setUpdatingId(id)
    try {
      const response = await fetch(`/api/admin/registrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update')
      await fetchRegistrations()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <Loading text="Loading registrations..." />

  return (
    <div className="space-y-4">
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      {registrations.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="font-medium">No registrations yet</p>
          <p className="text-sm mt-1">
            Food drive and kit-packing registrations submitted by volunteers appear here.
          </p>
        </div>
      ) : (
        registrations.map((reg) => (
          <div key={reg.id} className="card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{reg.user.name}</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    {reg.opportunityType.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[reg.status] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {reg.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Planned delivery:{' '}
                  <span className="font-medium">
                    {new Date(reg.plannedDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {reg.user.email}
                  {(reg.phone || reg.user.phone) && ` · ${reg.phone || reg.user.phone}`}
                </p>
                {reg.message && <p className="text-sm text-gray-500 mt-2 italic">{reg.message}</p>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {reg.status === 'pending' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setStatus(reg.id, 'confirmed')}
                    loading={updatingId === reg.id}
                  >
                    Confirm
                  </Button>
                )}
                {reg.status === 'confirmed' && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => setStatus(reg.id, 'completed')}
                    loading={updatingId === reg.id}
                  >
                    Mark Completed
                  </Button>
                )}
                {['pending', 'confirmed'].includes(reg.status) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setStatus(reg.id, 'cancelled')}
                    loading={updatingId === reg.id}
                    className="text-red-600"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ============ Hour Logs ============

interface AdminHourLog {
  id: number
  clockIn: string
  totalMinutes: number | null
  notes: string | null
  source: string
  verified: boolean
  user: { id: number; name: string; email: string }
  opportunityType: { id: number; name: string } | null
}

export function HourLogsTab() {
  const [logs, setLogs] = useState<AdminHourLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onlyUnverified, setOnlyUnverified] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    fetchLogs(onlyUnverified)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnverified])

  const fetchLogs = async (unverified: boolean) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/admin/hour-logs${unverified ? '?unverified=1' : ''}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch hour logs')
      setLogs(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hour logs')
    } finally {
      setLoading(false)
    }
  }

  const setVerified = async (id: number, verified: boolean) => {
    setUpdatingId(id)
    try {
      const response = await fetch(`/api/admin/hour-logs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update')
      await fetchLogs(onlyUnverified)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <Loading text="Loading hour logs..." />

  return (
    <div className="space-y-4">
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={onlyUnverified}
          onChange={(e) => setOnlyUnverified(e.target.checked)}
          className="w-4 h-4"
        />
        Show only unverified self-reported entries
      </label>

      {logs.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <BadgeCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">
            {onlyUnverified ? 'Nothing waiting for verification' : 'No hour logs'}
          </p>
        </div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{log.user.name}</span>
                  {log.opportunityType && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      {log.opportunityType.name}
                    </span>
                  )}
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {log.source}
                  </span>
                  {log.verified && (
                    <span className="flex items-center gap-1 text-xs text-green-700">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(log.clockIn).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {log.totalMinutes != null && (
                    <span className="font-medium"> · {(log.totalMinutes / 60).toFixed(2)}h</span>
                  )}
                </p>
                {log.notes && <p className="text-sm text-gray-500 mt-1 italic">{log.notes}</p>}
              </div>
              <div>
                {log.verified ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setVerified(log.id, false)}
                    loading={updatingId === log.id}
                  >
                    Un-verify
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setVerified(log.id, true)}
                    loading={updatingId === log.id}
                  >
                    <BadgeCheck className="w-4 h-4" />
                    Verify
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
