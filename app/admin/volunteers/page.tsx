'use client'

// Volunteer portal build-out (#65)
// Admin volunteer management hub:
//  - Opportunity Types tab: CRUD for the Bloomerang-style opportunity cards
//    (name, description, image, manager contact, self-reported flag)
//  - Recurring Schedules tab: define repeating shifts (opportunity type,
//    weekdays, time, volunteers needed) and generate upcoming shifts
// Individual shifts/signups continue to be managed at /admin/shifts.

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CalendarPlus, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'
import {
  ScheduledOpportunitiesTab,
  RegistrationsTab,
  HourLogsTab,
} from '@/components/admin/VolunteerHubTabs'

interface OpportunityType {
  id: number
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  iconUrl: string | null
  managerName: string | null
  managerEmail: string | null
  managerPhone: string | null
  kind: 'shifts' | 'routes' | 'self-reported' | 'registration'
  maxConcurrentSignups: number | null
  systemManaged: boolean
  active: boolean
  sortOrder: number
  _count: { shifts: number; templates: number; userPreferences: number }
}

const KIND_LABELS: Record<string, string> = {
  shifts: 'Shift signup',
  routes: 'Driver routes',
  'self-reported': 'Self-reported hours',
  registration: 'Registration',
}

interface Template {
  id: number
  opportunityTypeId: number
  opportunityType: { id: number; name: string }
  frequency: string
  daysOfWeek: string
  startTime: string
  endTime: string
  location: string
  spotsNeeded: number
  notes: string | null
  startDate: string
  endDate: string | null
  generateDaysAhead: number
  active: boolean
  _count: { shifts: number }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const emptyTypeForm = {
  name: '',
  description: '',
  imageUrl: '',
  iconUrl: '',
  managerName: '',
  managerEmail: '',
  managerPhone: '',
  kind: 'shifts',
  maxConcurrentSignups: '',
  active: true,
  sortOrder: 0,
}

const emptyTemplateForm = {
  opportunityTypeId: 0,
  frequency: 'weekly',
  daysOfWeek: [] as number[],
  startTime: '09:00',
  endTime: '12:00',
  location: 'Distribution Center',
  spotsNeeded: 4,
  notes: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
}

type HubTab = 'types' | 'schedules' | 'schedule' | 'registrations' | 'hours'

function AdminVolunteersContent() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as HubTab) || 'types'
  const [tab, setTab] = useState<HubTab>(
    ['types', 'schedules', 'schedule', 'registrations', 'hours'].includes(initialTab)
      ? initialTab
      : 'types'
  )
  const [types, setTypes] = useState<OpportunityType[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Opportunity type modal state
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null)
  const [typeForm, setTypeForm] = useState({ ...emptyTypeForm })

  // Template modal state
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)
  const [templateForm, setTemplateForm] = useState({ ...emptyTemplateForm })

  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError(null)
      const [typesRes, templatesRes] = await Promise.all([
        fetch('/api/admin/opportunity-types'),
        fetch('/api/admin/recurring-shifts'),
      ])
      const typesData = await typesRes.json()
      const templatesData = await templatesRes.json()
      if (!typesRes.ok) throw new Error(typesData.error || 'Failed to load opportunity types')
      if (!templatesRes.ok) throw new Error(templatesData.error || 'Failed to load schedules')
      setTypes(typesData.data)
      setTemplates(templatesData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // --- Opportunity type handlers ---

  const openCreateType = () => {
    setEditingTypeId(null)
    setTypeForm({ ...emptyTypeForm })
    setTypeModalOpen(true)
  }

  const openEditType = (t: OpportunityType) => {
    setEditingTypeId(t.id)
    setTypeForm({
      name: t.name,
      description: t.description || '',
      imageUrl: t.imageUrl || '',
      iconUrl: t.iconUrl || '',
      managerName: t.managerName || '',
      managerEmail: t.managerEmail || '',
      managerPhone: t.managerPhone || '',
      kind: t.kind,
      maxConcurrentSignups: t.maxConcurrentSignups ? String(t.maxConcurrentSignups) : '',
      active: t.active,
      sortOrder: t.sortOrder,
    })
    setTypeModalOpen(true)
  }

  const saveType = async () => {
    setSaving(true)
    try {
      const url = editingTypeId
        ? `/api/admin/opportunity-types/${editingTypeId}`
        : '/api/admin/opportunity-types'
      const response = await fetch(url, {
        method: editingTypeId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save')
      setTypeModalOpen(false)
      await fetchAll()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const deleteType = async (t: OpportunityType) => {
    if (!confirm(`Remove "${t.name}"? If it has shifts or schedules it will be deactivated instead of deleted.`)) return
    try {
      const response = await fetch(`/api/admin/opportunity-types/${t.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to remove')
      await fetchAll()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  // --- Template handlers ---

  const openCreateTemplate = () => {
    setEditingTemplateId(null)
    setTemplateForm({
      ...emptyTemplateForm,
      // recurring schedules only apply to shift-signup types
      opportunityTypeId: types.find((t) => t.active && t.kind === 'shifts')?.id ?? 0,
    })
    setTemplateModalOpen(true)
  }

  const openEditTemplate = (t: Template) => {
    setEditingTemplateId(t.id)
    setTemplateForm({
      opportunityTypeId: t.opportunityTypeId,
      frequency: t.frequency,
      daysOfWeek: JSON.parse(t.daysOfWeek || '[]'),
      startTime: t.startTime,
      endTime: t.endTime,
      location: t.location,
      spotsNeeded: t.spotsNeeded,
      notes: t.notes || '',
      startDate: t.startDate.slice(0, 10),
      endDate: t.endDate ? t.endDate.slice(0, 10) : '',
    })
    setTemplateModalOpen(true)
  }

  const saveTemplate = async () => {
    if (templateForm.daysOfWeek.length === 0) {
      alert('Select at least one day of the week')
      return
    }
    setSaving(true)
    try {
      const url = editingTemplateId
        ? `/api/admin/recurring-shifts/${editingTemplateId}`
        : '/api/admin/recurring-shifts'
      const response = await fetch(url, {
        method: editingTemplateId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateForm,
          endDate: templateForm.endDate || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save')
      setTemplateModalOpen(false)
      await fetchAll()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const deactivateTemplate = async (t: Template) => {
    if (!confirm('Deactivate this recurring schedule? Already-generated shifts are kept.')) return
    try {
      const response = await fetch(`/api/admin/recurring-shifts/${t.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to deactivate')
      await fetchAll()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate')
    }
  }

  const generateShifts = async () => {
    setGenerating(true)
    setGenerateResult(null)
    try {
      const response = await fetch('/api/admin/recurring-shifts/generate', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate shifts')
      setGenerateResult(
        `Created ${data.data.shiftsCreated} shift(s) from ${data.data.templatesProcessed} schedule(s).` +
          (data.data.errors.length ? ` Errors: ${data.data.errors.join('; ')}` : '')
      )
      await fetchAll()
    } catch (err) {
      setGenerateResult(err instanceof Error ? err.message : 'Failed to generate shifts')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <Loading text="Loading volunteer management..." />

  return (
    <div className="space-y-6">
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {(
            [
              ['types', `Opportunity Types (${types.length})`],
              ['schedules', `Recurring Schedules (${templates.filter((t) => t.active).length})`],
              ['schedule', 'Scheduled Opportunities'],
              ['registrations', 'Registrations'],
              ['hours', 'Hour Logs'],
            ] as [HubTab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'schedule' ? (
        <ScheduledOpportunitiesTab
          types={types.map((t) => ({ id: t.id, name: t.name, kind: t.kind, active: t.active }))}
        />
      ) : tab === 'registrations' ? (
        <RegistrationsTab />
      ) : tab === 'hours' ? (
        <HourLogsTab />
      ) : tab === 'types' ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" onClick={openCreateType}>
              <Plus className="w-4 h-4" />
              New Opportunity Type
            </Button>
          </div>

          {types.length === 0 ? (
            <div className="card text-center py-12 text-gray-500">
              <p className="font-medium">No opportunity types yet</p>
              <p className="text-sm mt-1">
                Create types like &quot;Distribution&quot;, &quot;Birthday Bags&quot;, or
                &quot;Self-reported Service Hours&quot; — they become the cards volunteers see in
                their portal. (Or run scripts/seed-opportunity-types.ts)
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {types.map((t) => (
                <div key={t.id} className={`card ${t.active ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{t.name}</h3>
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                          {KIND_LABELS[t.kind] || t.kind}
                        </span>
                        {t.systemManaged && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                            System-managed
                          </span>
                        )}
                        {t.maxConcurrentSignups != null && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                            Max {t.maxConcurrentSignups} at a time
                          </span>
                        )}
                        {!t.active && (
                          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-3">{t.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Manager: {t.managerName || '—'}
                        {t.managerEmail ? ` (${t.managerEmail})` : ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t._count.shifts} shifts · {t._count.templates} schedules ·{' '}
                        {t._count.userPreferences} subscribers
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditType(t)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </button>
                      {!t.systemManaged && (
                        <button
                          onClick={() => deleteType(t)}
                          className="p-2 hover:bg-red-50 rounded-lg"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex justify-end gap-2 flex-wrap">
            <Button variant="secondary" onClick={generateShifts} loading={generating}>
              <RefreshCw className="w-4 h-4" />
              Generate Upcoming Shifts
            </Button>
            <Button variant="primary" onClick={openCreateTemplate} disabled={types.length === 0}>
              <CalendarPlus className="w-4 h-4" />
              New Recurring Schedule
            </Button>
          </div>
          {generateResult && (
            <p className="text-sm text-gray-700 bg-green-50 border border-green-200 rounded-lg p-3">
              {generateResult}
            </p>
          )}

          {templates.length === 0 ? (
            <div className="card text-center py-12 text-gray-500">
              <p className="font-medium">No recurring schedules yet</p>
              <p className="text-sm mt-1">
                Define a repeating shift (e.g. Distribution every Tue/Thu 9-12, 6 volunteers) and
                use &quot;Generate Upcoming Shifts&quot; to publish them to the volunteer portal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => {
                const days: number[] = JSON.parse(t.daysOfWeek || '[]')
                return (
                  <div key={t.id} className={`card ${t.active ? '' : 'opacity-60'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{t.opportunityType.name}</h3>
                          {!t.active && (
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {t.frequency} on {days.map((d) => WEEKDAYS[d]).join(', ')} ·{' '}
                          {t.startTime}-{t.endTime} · {t.location}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {t.spotsNeeded} volunteers needed · {t._count.shifts} shifts generated ·
                          from {new Date(t.startDate).toLocaleDateString()}
                          {t.endDate ? ` to ${new Date(t.endDate).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditTemplate(t)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4 text-gray-600" />
                        </button>
                        {t.active && (
                          <button
                            onClick={() => deactivateTemplate(t)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Opportunity Type Modal */}
      {typeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {editingTypeId ? 'Edit Opportunity Type' : 'New Opportunity Type'}
              </h3>
              <button onClick={() => setTypeModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Name *</label>
                <input
                  className="input w-full"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="e.g. Distribution"
                />
              </div>
              <div>
                <label className="label">Description (shown on the volunteer card)</label>
                <textarea
                  className="input w-full"
                  rows={4}
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Paste the description from Bloomerang here"
                />
              </div>
              <div>
                <label className="label">Cover image URL (banner on the detail page)</label>
                <input
                  className="input w-full"
                  placeholder="/opportunities/distribution-cover.jpg"
                  value={typeForm.imageUrl}
                  onChange={(e) => setTypeForm({ ...typeForm, imageUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Icon URL (small logo on the tile)</label>
                <input
                  className="input w-full"
                  placeholder="/opportunities/distribution-icon.png"
                  value={typeForm.iconUrl}
                  onChange={(e) => setTypeForm({ ...typeForm, iconUrl: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Manager Name</label>
                  <input
                    className="input w-full"
                    value={typeForm.managerName}
                    onChange={(e) => setTypeForm({ ...typeForm, managerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Manager Email</label>
                  <input
                    className="input w-full"
                    type="email"
                    value={typeForm.managerEmail}
                    onChange={(e) => setTypeForm({ ...typeForm, managerEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Manager Phone</label>
                  <input
                    className="input w-full"
                    type="tel"
                    value={typeForm.managerPhone}
                    onChange={(e) => setTypeForm({ ...typeForm, managerPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Max sign-ups at a time</label>
                  <input
                    className="input w-full"
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={typeForm.maxConcurrentSignups}
                    onChange={(e) =>
                      setTypeForm({ ...typeForm, maxConcurrentSignups: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="label">Kind</label>
                <select
                  className="input w-full"
                  value={typeForm.kind}
                  disabled={Boolean(
                    editingTypeId && types.find((t) => t.id === editingTypeId)?.systemManaged
                  )}
                  onChange={(e) => setTypeForm({ ...typeForm, kind: e.target.value })}
                >
                  <option value="shifts">Shift signup (scheduled shifts)</option>
                  <option value="self-reported">Self-reported hours (no signup)</option>
                  <option value="registration">Registration (planned delivery date)</option>
                  <option value="routes">Driver routes (synced from Routes)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={typeForm.active}
                  onChange={(e) => setTypeForm({ ...typeForm, active: e.target.checked })}
                  className="w-4 h-4"
                />
                Visible to volunteers (uncheck to hide this opportunity without deleting it)
              </label>
              <div>
                <label className="label">Sort Order</label>
                <input
                  className="input w-24"
                  type="number"
                  value={typeForm.sortOrder}
                  onChange={(e) => setTypeForm({ ...typeForm, sortOrder: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setTypeModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveType} loading={saving} disabled={!typeForm.name.trim()}>
                {editingTypeId ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Schedule Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {editingTemplateId ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
              </h3>
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Opportunity Type *</label>
                <select
                  className="input w-full"
                  value={templateForm.opportunityTypeId}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, opportunityTypeId: Number(e.target.value) })
                  }
                >
                  {types
                    .filter((t) => t.active && t.kind === 'shifts')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label">Repeats *</label>
                <div className="flex gap-3 items-center flex-wrap">
                  <select
                    className="input"
                    value={templateForm.frequency}
                    onChange={(e) => setTemplateForm({ ...templateForm, frequency: e.target.value })}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every other week</option>
                    <option value="monthly">Monthly (first week)</option>
                  </select>
                  <div className="flex gap-1">
                    {WEEKDAYS.map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setTemplateForm({
                            ...templateForm,
                            daysOfWeek: templateForm.daysOfWeek.includes(i)
                              ? templateForm.daysOfWeek.filter((d) => d !== i)
                              : [...templateForm.daysOfWeek, i].sort(),
                          })
                        }
                        className={`w-9 h-9 rounded-full text-xs font-medium ${
                          templateForm.daysOfWeek.includes(i)
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 2)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Time *</label>
                  <input
                    className="input w-full"
                    type="time"
                    value={templateForm.startTime}
                    onChange={(e) => setTemplateForm({ ...templateForm, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">End Time *</label>
                  <input
                    className="input w-full"
                    type="time"
                    value={templateForm.endTime}
                    onChange={(e) => setTemplateForm({ ...templateForm, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Location</label>
                  <input
                    className="input w-full"
                    value={templateForm.location}
                    onChange={(e) => setTemplateForm({ ...templateForm, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Volunteers Needed *</label>
                  <input
                    className="input w-full"
                    type="number"
                    min={1}
                    value={templateForm.spotsNeeded}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, spotsNeeded: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    className="input w-full"
                    type="date"
                    value={templateForm.startDate}
                    onChange={(e) => setTemplateForm({ ...templateForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">End Date (optional)</label>
                  <input
                    className="input w-full"
                    type="date"
                    value={templateForm.endDate}
                    onChange={(e) => setTemplateForm({ ...templateForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Notes (shown to volunteers)</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={templateForm.notes}
                  onChange={(e) => setTemplateForm({ ...templateForm, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setTemplateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveTemplate}
                loading={saving}
                disabled={!templateForm.opportunityTypeId || templateForm.daysOfWeek.length === 0}
              >
                {editingTemplateId ? 'Save Changes' : 'Create Schedule'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminVolunteersPage() {
  return (
    <Suspense fallback={<Loading text="Loading volunteer management..." />}>
      <AdminVolunteersContent />
    </Suspense>
  )
}
