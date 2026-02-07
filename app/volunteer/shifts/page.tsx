'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Calendar, Clock, MapPin, Users, HelpCircle, CheckCircle } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'

interface Shift {
  id: number
  date: string
  startTime: string
  endTime: string
  location: string
  spotsNeeded: number
  spotsAvailable: number
  notes: string | null
  userStatus: 'none' | 'pending' | 'approved' | 'waitlisted' | 'cancelled'
}

export default function VolunteerShiftsPage() {
  const router = useRouter()
  const { status } = useSession()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchShifts()
    }
  }, [status, router])

  const fetchShifts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/volunteer/shifts')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch shifts')
      }

      setShifts(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (shiftId: number) => {
    setProcessingId(shiftId)
    try {
      const response = await fetch(`/api/volunteer/shifts/${shiftId}/signup`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up')
      }

      await fetchShifts()

      if (data.data.status === 'waitlisted') {
        alert('This shift is full. You have been added to the waitlist.')
      } else {
        alert('Successfully signed up for the shift!')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancel = async (shiftId: number) => {
    if (!confirm('Are you sure you want to cancel your signup for this shift?')) return

    setProcessingId(shiftId)
    try {
      const response = await fetch(`/api/volunteer/shifts/${shiftId}/cancel`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel')
      }

      await fetchShifts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setProcessingId(null)
    }
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading available shifts..." />
  }

  const availableShifts = shifts.filter(
    (s) => s.userStatus === 'none' && new Date(s.date) >= new Date()
  )
  const myShifts = shifts.filter(
    (s) => ['pending', 'approved', 'waitlisted'].includes(s.userStatus)
  )

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
              <h1 className="text-xl font-bold text-gray-900">Volunteer Shifts</h1>
            </div>
            <button
              onClick={() => router.push('/volunteer/help')}
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

        {/* My Signups Section */}
        {myShifts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              My Signups
            </h2>
            <div className="space-y-3">
              {myShifts.map((shift) => (
                <div
                  key={shift.id}
                  className={`card ${
                    shift.userStatus === 'approved'
                      ? 'border-2 border-green-200 bg-green-50'
                      : shift.userStatus === 'waitlisted'
                      ? 'border-2 border-yellow-200 bg-yellow-50'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {new Date(shift.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Clock className="w-4 h-4" />
                        {shift.startTime} - {shift.endTime}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <MapPin className="w-4 h-4" />
                        {shift.location}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          shift.userStatus === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : shift.userStatus === 'waitlisted'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {shift.userStatus.charAt(0).toUpperCase() + shift.userStatus.slice(1)}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCancel(shift.id)}
                        loading={processingId === shift.id}
                        className="mt-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available Shifts Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Available Shifts
          </h2>

          {availableShifts.length > 0 ? (
            <div className="space-y-3">
              {availableShifts.map((shift) => (
                <div key={shift.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {new Date(shift.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Clock className="w-4 h-4" />
                        {shift.startTime} - {shift.endTime}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <MapPin className="w-4 h-4" />
                        {shift.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Users className="w-4 h-4" />
                        {shift.spotsAvailable > 0 ? (
                          <span className="text-green-600">
                            {shift.spotsAvailable} of {shift.spotsNeeded} spots available
                          </span>
                        ) : (
                          <span className="text-yellow-600">Waitlist only</span>
                        )}
                      </div>
                      {shift.notes && (
                        <p className="text-sm text-gray-500 mt-2 italic">{shift.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSignup(shift.id)}
                      loading={processingId === shift.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {shift.spotsAvailable > 0 ? 'Sign Up' : 'Join Waitlist'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No available shifts</p>
              <p className="text-sm mt-1">Check back soon for new volunteer opportunities!</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
