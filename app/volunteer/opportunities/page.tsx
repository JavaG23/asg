'use client'

// Volunteer portal build-out (#65)
// Calendar of available volunteer opportunities. Month-grid + list views and
// one-tap opportunity-type filter chips, ported (simplified) from the
// bapol-pwa calendar (bapol-pwa/app/calendar/page.tsx — custom React grid,
// no calendar library). Map/near-me/friends features intentionally dropped.

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  MapPin,
  Users,
} from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'

interface Opportunity {
  id: number
  date: string
  startTime: string
  endTime: string
  location: string
  notes: string | null
  spotsNeeded: number
  spotsAvailable: number
  opportunityType: { id: number; name: string; slug: string } | null
  userStatus: 'none' | 'pending' | 'approved' | 'waitlisted' | 'cancelled'
}

// Stable chip/dot color per opportunity type (cycled)
const TYPE_COLORS = [
  'bg-green-600',
  'bg-blue-600',
  'bg-purple-600',
  'bg-orange-500',
  'bg-pink-600',
  'bg-teal-600',
]

function OpportunitiesCalendar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()

  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [activeTypeId, setActiveTypeId] = useState<number | null>(() => {
    const t = searchParams.get('type')
    return t ? parseInt(t, 10) : null
  })
  const [signingUpId, setSigningUpId] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchOpportunities()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchOpportunities = async () => {
    try {
      setLoading(true)
      setError(null)
      const from = new Date()
      const to = new Date()
      to.setDate(to.getDate() + 90)
      const response = await fetch(
        `/api/volunteer/opportunities?from=${from.toISOString()}&to=${to.toISOString()}`
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch opportunities')
      setOpportunities(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (id: number) => {
    setSigningUpId(id)
    try {
      const response = await fetch(`/api/volunteer/shifts/${id}/signup`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        // 65j: driving requires the driver role — offer the request flow
        if (data.code === 'DRIVER_ROLE_REQUIRED') {
          if (
            confirm(
              'Driving requires an approved driver role. Request driver access now? An admin will review your request.'
            )
          ) {
            const reqRes = await fetch('/api/volunteer/request-driver-role', { method: 'POST' })
            const reqData = await reqRes.json()
            alert(reqData.message || (reqRes.ok ? 'Request submitted' : 'Request failed'))
          }
          return
        }
        throw new Error(data.error || 'Failed to sign up')
      }
      await fetchOpportunities()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setSigningUpId(null)
    }
  }

  // Distinct types present in the loaded data -> filter chips
  const typeChips = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>()
    opportunities.forEach((o) => {
      if (o.opportunityType) map.set(o.opportunityType.id, o.opportunityType)
    })
    return Array.from(map.values())
  }, [opportunities])

  const typeColor = (typeId: number | null | undefined) => {
    if (typeId == null) return 'bg-gray-400'
    const idx = typeChips.findIndex((t) => t.id === typeId)
    return TYPE_COLORS[(idx >= 0 ? idx : 0) % TYPE_COLORS.length]
  }

  const filtered = useMemo(
    () =>
      activeTypeId === null
        ? opportunities
        : opportunities.filter((o) => o.opportunityType?.id === activeTypeId),
    [opportunities, activeTypeId]
  )

  // --- Month grid helpers (pattern from bapol-pwa calendar) ---
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d))
    return cells
  }, [currentMonth])

  const opportunitiesForDay = (day: Date) =>
    filtered.filter((o) => {
      const d = new Date(o.date)
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      )
    })

  const navigateMonth = (delta: number) => {
    setSelectedDay(null)
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  const isToday = (d: Date) => {
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading opportunities..." />
  }

  const selectedDayOpportunities = selectedDay ? opportunitiesForDay(selectedDay) : []

  const renderOpportunityRow = (opp: Opportunity) => (
    <div key={opp.id} className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${typeColor(opp.opportunityType?.id)}`} />
            <p className="font-semibold text-gray-900">
              {opp.opportunityType?.name || 'Volunteer Shift'}
            </p>
          </div>
          <p className="text-sm text-gray-700 mt-1">
            {new Date(opp.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Clock className="w-4 h-4" />
            {opp.startTime} - {opp.endTime}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <MapPin className="w-4 h-4" />
            {opp.location}
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <Users className="w-4 h-4 text-gray-500" />
            {opp.spotsAvailable > 0 ? (
              <span className="text-green-600">{opp.spotsAvailable} spots available</span>
            ) : (
              <span className="text-yellow-600">Waitlist only</span>
            )}
          </div>
        </div>
        {opp.userStatus === 'none' ? (
          <Button
            variant="primary"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleSignup(opp.id)}
            loading={signingUpId === opp.id}
          >
            {opp.spotsAvailable > 0 ? 'Sign Up' : 'Join Waitlist'}
          </Button>
        ) : (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              opp.userStatus === 'approved'
                ? 'bg-green-100 text-green-700'
                : opp.userStatus === 'waitlisted'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {opp.userStatus.charAt(0).toUpperCase() + opp.userStatus.slice(1)}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/volunteer/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Opportunities</h1>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`p-2 rounded-md ${viewMode === 'month' ? 'bg-white shadow-sm' : ''}`}
              title="Month view"
            >
              <CalendarIcon className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              title="List view"
            >
              <List className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Opportunity-type filter chips (pattern from bapol quick-filter chips) */}
        {typeChips.length > 0 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTypeId(null)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap border ${
                activeTypeId === null
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {typeChips.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTypeId(activeTypeId === t.id ? null : t.id)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap border flex items-center gap-1.5 ${
                  activeTypeId === t.id
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${typeColor(t.id)}`} />
                {t.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {viewMode === 'month' ? (
          <>
            {/* Month navigation */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <h2 className="font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              {/* Day cells with colored type dots */}
              <div className="grid grid-cols-7 gap-px">
                {daysInMonth.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />
                  const dayOpps = opportunitiesForDay(day)
                  const isSelected =
                    selectedDay && day.toDateString() === selectedDay.toDateString()
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 transition-colors ${
                        isSelected
                          ? 'bg-green-600 text-white'
                          : isToday(day)
                          ? 'bg-green-50 text-green-700 font-semibold'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {day.getDate()}
                      {dayOpps.length > 0 && (
                        <span className="flex gap-0.5">
                          {dayOpps.slice(0, 3).map((o) => (
                            <span
                              key={o.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-white' : typeColor(o.opportunityType?.id)
                              }`}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected day details */}
            {selectedDay && (
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {selectedDay.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                {selectedDayOpportunities.length > 0 ? (
                  <div className="space-y-3">{selectedDayOpportunities.map(renderOpportunityRow)}</div>
                ) : (
                  <p className="text-sm text-gray-500 card">No opportunities on this day.</p>
                )}
              </section>
            )}
          </>
        ) : (
          /* List view */
          <div className="space-y-3">
            {filtered.length > 0 ? (
              filtered.map(renderOpportunityRow)
            ) : (
              <div className="card text-center py-12 text-gray-500">
                <CalendarIcon className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No upcoming opportunities</p>
                <p className="text-sm mt-1">Check back soon!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<Loading text="Loading opportunities..." />}>
      <OpportunitiesCalendar />
    </Suspense>
  )
}
