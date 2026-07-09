'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, BadgeCheck, Clock, Calendar, History, HelpCircle, FileText, Plus, X } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'

interface HourLog {
  id: number
  clockIn: string
  clockOut: string | null
  totalMinutes: number | null
  notes: string | null
  shiftDate: string | null
  shiftLocation: string | null
  opportunityType: string | null
  source: string
  verified: boolean
}

interface HoursData {
  logs: HourLog[]
  totalHours: number
  totalShifts: number
  hoursThisMonth: number
  hoursThisYear: number
}

interface TypeOption {
  id: number
  name: string
  kind: string
}

function VolunteerHoursContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const [data, setData] = useState<HoursData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 65j: manual "Add Hours" entry for self-reported/registration opportunities
  const [logTypes, setLogTypes] = useState<TypeOption[]>([])
  const [showAddModal, setShowAddModal] = useState(searchParams.get('log') === '1')
  const [form, setForm] = useState({
    opportunityTypeId: searchParams.get('type') || '',
    date: '',
    hours: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchHours()
      fetchLogTypes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchHours = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/volunteer/hours')
      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to fetch hours')
      }

      setData(responseData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hours')
    } finally {
      setLoading(false)
    }
  }

  // Types that accept manual hour entry (non-fatal if unavailable)
  const fetchLogTypes = async () => {
    try {
      const response = await fetch('/api/volunteer/opportunity-types')
      const responseData = await response.json()
      if (response.ok) {
        setLogTypes(
          responseData.data.types.filter((t: TypeOption) =>
            ['self-reported', 'registration'].includes(t.kind)
          )
        )
      }
    } catch {
      // Add Hours button simply won't show
    }
  }

  const handleAddHours = async () => {
    setSubmitting(true)
    setSubmitResult(null)
    try {
      const response = await fetch('/api/volunteer/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityTypeId: Number(form.opportunityTypeId),
          date: form.date,
          hours: Number(form.hours),
          notes: form.notes,
        }),
      })
      const responseData = await response.json()
      if (!response.ok) throw new Error(responseData.error || 'Failed to log hours')
      setSubmitResult(responseData.message || 'Hours submitted!')
      setForm({ opportunityTypeId: '', date: '', hours: '', notes: '' })
      await fetchHours()
    } catch (err) {
      setSubmitResult(err instanceof Error ? err.message : 'Failed to log hours')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading your hours..." />
  }

  const canAddHours = logTypes.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/volunteer/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">My Hours</h1>
            </div>
            <div className="flex items-center gap-2">
              {canAddHours && (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add Hours
                </Button>
              )}
              <button
                onClick={() => router.push('/volunteer/help')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto space-y-6">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">
              {data?.totalHours.toFixed(1) || 0}
            </p>
            <p className="text-sm text-gray-600">Total Hours</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-gray-900">{data?.totalShifts || 0}</p>
            <p className="text-sm text-gray-600">Total Shifts</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">This Month</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {data?.hoursThisMonth.toFixed(1) || 0}h
            </p>
          </div>
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">This Year</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {data?.hoursThisYear.toFixed(1) || 0}h
            </p>
          </div>
        </div>

        {/* Hour Log */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            Hour Log
          </h2>

          {data?.logs && data.logs.length > 0 ? (
            <div className="space-y-3">
              {data.logs.map((log) => (
                <div
                  key={log.id}
                  className={`card ${!log.clockOut ? 'border-2 border-green-300 bg-green-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(log.clockIn).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      {log.opportunityType && (
                        <p className="text-sm text-gray-600 mt-0.5">{log.opportunityType}</p>
                      )}
                      {log.source === 'clock' && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Clock className="w-4 h-4" />
                          {new Date(log.clockIn).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' - '}
                          {log.clockOut
                            ? new Date(log.clockOut).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'In progress'}
                        </div>
                      )}
                      {log.shiftLocation && (
                        <p className="text-sm text-gray-500 mt-1">{log.shiftLocation}</p>
                      )}
                      {log.notes && (
                        <p className="text-sm text-gray-500 mt-2 flex items-start gap-1">
                          <FileText className="w-3 h-3 mt-1 flex-shrink-0" />
                          {log.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {log.totalMinutes ? (
                        <span className="text-lg font-bold text-green-600">
                          {formatDuration(log.totalMinutes)}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Active
                        </span>
                      )}
                      {log.verified && (
                        <span
                          className="flex items-center gap-1 justify-end text-xs text-green-700 mt-1"
                          title="Verified by the pantry"
                        >
                          <BadgeCheck className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No hours logged yet</p>
              <p className="text-sm mt-1">
                Clock in from the dashboard to start tracking your volunteer hours.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Add Hours Modal (65j) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Add Hours Worked</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSubmitResult(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Opportunity *</label>
                <select
                  className="input w-full"
                  value={form.opportunityTypeId}
                  onChange={(e) => setForm({ ...form, opportunityTypeId: e.target.value })}
                >
                  <option value="">Select an opportunity...</option>
                  {logTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date worked *</label>
                  <input
                    type="date"
                    className="input w-full"
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Hours *</label>
                  <input
                    type="number"
                    className="input w-full"
                    min={0.25}
                    max={24}
                    step={0.25}
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">What did you do? *</label>
                <textarea
                  className="input w-full"
                  rows={3}
                  maxLength={1000}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Describe the work done to earn these hours..."
                />
              </div>
            </div>
            {submitResult && <p className="text-sm mt-2 text-gray-600">{submitResult}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleAddHours}
                loading={submitting}
                disabled={!form.opportunityTypeId || !form.date || !form.hours || !form.notes.trim()}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function VolunteerHoursPage() {
  return (
    <Suspense fallback={<Loading text="Loading your hours..." />}>
      <VolunteerHoursContent />
    </Suspense>
  )
}
