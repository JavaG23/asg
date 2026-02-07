'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, Bell, HelpCircle } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'

interface PickupEvent {
  id: number
  date: string
  description: string | null
  optInDeadline: string | null
  optedIn: boolean
  reminderPreference: string | null
  canOptIn: boolean
}

export default function DonorPickupsPage() {
  const router = useRouter()
  const { status } = useSession()
  const [events, setEvents] = useState<PickupEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [showReminderModal, setShowReminderModal] = useState<number | null>(null)
  const [reminderPreference, setReminderPreference] = useState('24h')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchEvents()
    }
  }, [status, router])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/donor/events')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events')
      }

      setEvents(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleOptIn = async (eventId: number) => {
    setProcessingId(eventId)
    try {
      const response = await fetch(`/api/donor/events/${eventId}/optin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderPreference }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to opt in')
      }

      await fetchEvents()
      setShowReminderModal(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to opt in')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancel = async (eventId: number) => {
    if (!confirm('Are you sure you want to cancel this pickup?')) return

    setProcessingId(eventId)
    try {
      const response = await fetch(`/api/donor/events/${eventId}/cancel`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel')
      }

      await fetchEvents()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setProcessingId(null)
    }
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading pickup dates..." />
  }

  const upcomingEvents = events.filter((e) => new Date(e.date) >= new Date())
  const optedInEvents = upcomingEvents.filter((e) => e.optedIn)
  const availableEvents = upcomingEvents.filter((e) => !e.optedIn && e.canOptIn)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/donor/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Pickup Dates</h1>
            </div>
            <button
              onClick={() => router.push('/donor/help')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto space-y-6">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* Opted In Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Your Scheduled Pickups
          </h2>

          {optedInEvents.length > 0 ? (
            <div className="space-y-3">
              {optedInEvents.map((event) => (
                <div key={event.id} className="card border-2 border-green-200 bg-green-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <Bell className="w-4 h-4" />
                        <span>
                          Reminder: {event.reminderPreference === 'none' ? 'Off' : event.reminderPreference + ' before'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCancel(event.id)}
                      loading={processingId === event.id}
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>You haven't opted in to any pickup dates yet.</p>
            </div>
          )}
        </section>

        {/* Available Dates Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            Available Pickup Dates
          </h2>

          {availableEvents.length > 0 ? (
            <div className="space-y-3">
              {availableEvents.map((event) => (
                <div key={event.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                      {event.optInDeadline && (
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Opt-in by: {new Date(event.optInDeadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setReminderPreference('24h')
                        setShowReminderModal(event.id)
                      }}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Opt In
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8 text-gray-500">
              <p>No available pickup dates at this time.</p>
              <p className="text-sm mt-1">Check back soon for new dates!</p>
            </div>
          )}
        </section>
      </main>

      {/* Reminder Preference Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reminder Preference
            </h3>
            <p className="text-gray-600 mb-4">
              When would you like to receive a reminder email before this pickup?
            </p>

            <div className="space-y-2 mb-6">
              {[
                { value: '24h', label: '24 hours before' },
                { value: '48h', label: '48 hours before' },
                { value: 'none', label: 'No reminder' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    reminderPreference === option.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reminder"
                    value={option.value}
                    checked={reminderPreference === option.value}
                    onChange={(e) => setReminderPreference(e.target.value)}
                    className="text-red-500 focus:ring-red-500"
                  />
                  <span className="text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => handleOptIn(showReminderModal)}
                loading={processingId === showReminderModal}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                Confirm Opt-In
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowReminderModal(null)}
                disabled={processingId === showReminderModal}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
