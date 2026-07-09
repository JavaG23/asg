'use client'

// Volunteer portal build-out (#65)
// "My Opportunities": Bloomerang-style opportunity cards (filtered by the
// user's preferences) plus tabs for shifts I'm signed up for vs. shifts
// available to me. Tab pattern modeled on bapol-pwa/app/my-events/page.tsx.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Calendar, CheckCircle, Clock, MapPin, Users } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'
import { OpportunityCard, OpportunityTypeInfo } from '@/components/volunteer/OpportunityCard'

interface Opportunity {
  id: number
  date: string
  startTime: string
  endTime: string
  location: string
  spotsNeeded: number
  spotsAvailable: number
  opportunityType: { id: number; name: string; slug: string; kind?: string } | null
  userStatus: 'none' | 'pending' | 'approved' | 'waitlisted' | 'cancelled'
  assignedRoute?: { id: number; name: string; status: string } | null
}

type Tab = 'signedUp' | 'available'

export default function MyOpportunitiesPage() {
  const router = useRouter()
  const { status } = useSession()
  const [types, setTypes] = useState<OpportunityTypeInfo[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('signedUp')
  const [processingId, setProcessingId] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [typesRes, oppsRes] = await Promise.all([
        fetch('/api/volunteer/opportunity-types'),
        fetch('/api/volunteer/opportunities'),
      ])
      const typesData = await typesRes.json()
      const oppsData = await oppsRes.json()
      if (!typesRes.ok) throw new Error(typesData.error || 'Failed to load opportunity types')
      if (!oppsRes.ok) throw new Error(oppsData.error || 'Failed to load opportunities')
      // Only show types the user has enabled (their portal preferences)
      setTypes(typesData.data.types.filter((t: OpportunityTypeInfo & { enabled: boolean }) => t.enabled))
      setOpportunities(oppsData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (shiftId: number) => {
    if (!confirm('Cancel your signup for this opportunity?')) return
    setProcessingId(shiftId)
    try {
      const response = await fetch(`/api/volunteer/shifts/${shiftId}/cancel`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to cancel')
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSignup = async (shiftId: number) => {
    setProcessingId(shiftId)
    try {
      const response = await fetch(`/api/volunteer/shifts/${shiftId}/signup`, { method: 'POST' })
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
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setProcessingId(null)
    }
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading your opportunities..." />
  }

  const signedUp = opportunities.filter((o) =>
    ['pending', 'approved', 'waitlisted'].includes(o.userStatus)
  )
  const available = opportunities.filter((o) => o.userStatus === 'none')

  const list = tab === 'signedUp' ? signedUp : available

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/volunteer/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">My Opportunities</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* Opportunity-type cards (Bloomerang-style) */}
        {types.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Ways to Volunteer</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {types.map((t) => (
                <OpportunityCard key={t.id} type={t} />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Not seeing an opportunity?{' '}
              <button
                onClick={() => router.push('/volunteer/profile')}
                className="text-green-600 hover:text-green-700 underline"
              >
                Update your opportunity preferences
              </button>
            </p>
          </section>
        )}

        {/* Tabs: signed up vs available (pattern from bapol my-events) */}
        <section>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
            <button
              onClick={() => setTab('signedUp')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'signedUp' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
              }`}
            >
              Signed Up ({signedUp.length})
            </button>
            <button
              onClick={() => setTab('available')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'available' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
              }`}
            >
              Available ({available.length})
            </button>
          </div>

          {list.length > 0 ? (
            <div className="space-y-3">
              {list.map((opp) => (
                <div
                  key={opp.id}
                  className={`card ${
                    opp.userStatus === 'approved'
                      ? 'border-2 border-green-200 bg-green-50'
                      : opp.userStatus === 'waitlisted'
                      ? 'border-2 border-yellow-200 bg-yellow-50'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {opp.opportunityType?.name || 'Volunteer Shift'}
                      </p>
                      <p className="text-sm text-gray-700">
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
                      {tab === 'available' && (
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <Users className="w-4 h-4 text-gray-500" />
                          {opp.spotsAvailable > 0 ? (
                            <span className="text-green-600">
                              {opp.spotsAvailable} spots available
                            </span>
                          ) : (
                            <span className="text-yellow-600">Waitlist only</span>
                          )}
                        </div>
                      )}
                    </div>
                    {tab === 'signedUp' ? (
                      <div className="text-right">
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
                        {/* 65j: assigned driver route deep-links to the driver portal */}
                        {opp.assignedRoute && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="mt-2 bg-green-600 hover:bg-green-700 block ml-auto"
                            onClick={() => router.push('/driver/dashboard')}
                          >
                            View My Route
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleCancel(opp.id)}
                          loading={processingId === opp.id}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleSignup(opp.id)}
                        loading={processingId === opp.id}
                      >
                        {opp.spotsAvailable > 0 ? 'Sign Up' : 'Join Waitlist'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-500">
              {tab === 'signedUp' ? (
                <>
                  <CheckCircle className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No signups yet</p>
                  <button
                    onClick={() => setTab('available')}
                    className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    Browse available opportunities
                  </button>
                </>
              ) : (
                <>
                  <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No available opportunities</p>
                  <p className="text-sm mt-1">Check back soon!</p>
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
