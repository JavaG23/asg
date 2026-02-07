'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Check, X, Clock as ClockIcon, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'

interface Signup {
  id: number
  userId: number
  userName: string
  userEmail: string
  userPhone: string | null
  status: string
  requestedAt: string
  approvedAt: string | null
}

interface ShiftDetail {
  id: number
  date: string
  startTime: string
  endTime: string
  location: string
  spotsNeeded: number
  notes: string | null
  signups: Signup[]
}

export default function AdminShiftDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params
  const shiftId = parseInt(id)

  const [shift, setShift] = useState<ShiftDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  useEffect(() => {
    fetchShift()
  }, [shiftId])

  const fetchShift = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/shifts/${shiftId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch shift')
      }

      setShift(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift')
    } finally {
      setLoading(false)
    }
  }

  const handleSignupAction = async (signupId: number, action: 'approve' | 'reject') => {
    setProcessingId(signupId)
    try {
      const response = await fetch(`/api/admin/shifts/${shiftId}/signups/${signupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} signup`)
      }

      await fetchShift()
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} signup`)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return <Loading fullScreen text="Loading shift details..." />
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorMessage message={error} />
        <Button variant="secondary" onClick={() => router.push('/admin/shifts')} className="mt-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Shifts
        </Button>
      </div>
    )
  }

  if (!shift) {
    return (
      <div className="p-8 text-center text-gray-500">
        Shift not found
        <Button variant="secondary" onClick={() => router.push('/admin/shifts')} className="mt-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Shifts
        </Button>
      </div>
    )
  }

  const pendingSignups = shift.signups.filter((s) => s.status === 'pending')
  const approvedSignups = shift.signups.filter((s) => s.status === 'approved')
  const waitlistedSignups = shift.signups.filter((s) => s.status === 'waitlisted')
  const cancelledSignups = shift.signups.filter((s) => s.status === 'cancelled')

  const spotsRemaining = shift.spotsNeeded - approvedSignups.length

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/admin/shifts')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Shifts
      </button>

      {/* Shift Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {new Date(shift.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h1>
              <div className="mt-3 space-y-2 text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {shift.startTime} - {shift.endTime}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {shift.location}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {approvedSignups.length}/{shift.spotsNeeded} spots filled
                  {spotsRemaining > 0 ? (
                    <span className="text-green-600">({spotsRemaining} available)</span>
                  ) : (
                    <span className="text-yellow-600">(Full)</span>
                  )}
                </div>
              </div>
              {shift.notes && (
                <p className="mt-4 text-gray-500 italic">{shift.notes}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Signups */}
      {pendingSignups.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Pending Approval ({pendingSignups.length})
          </h2>
          <div className="space-y-3">
            {pendingSignups.map((signup) => (
              <Card key={signup.id} className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{signup.userName}</p>
                      <p className="text-sm text-gray-600">{signup.userEmail}</p>
                      {signup.userPhone && (
                        <p className="text-sm text-gray-500">{signup.userPhone}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Requested {new Date(signup.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSignupAction(signup.id, 'approve')}
                        loading={processingId === signup.id}
                        disabled={spotsRemaining <= 0}
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSignupAction(signup.id, 'reject')}
                        disabled={processingId === signup.id}
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Approved Signups */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500" />
          Approved ({approvedSignups.length})
        </h2>
        {approvedSignups.length > 0 ? (
          <div className="space-y-3">
            {approvedSignups.map((signup) => (
              <Card key={signup.id} className="border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{signup.userName}</p>
                      <p className="text-sm text-gray-600">{signup.userEmail}</p>
                      {signup.userPhone && (
                        <p className="text-sm text-gray-500">{signup.userPhone}</p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Approved
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No approved volunteers yet
            </CardContent>
          </Card>
        )}
      </section>

      {/* Waitlisted Signups */}
      {waitlistedSignups.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-gray-400" />
            Waitlisted ({waitlistedSignups.length})
          </h2>
          <div className="space-y-3">
            {waitlistedSignups.map((signup) => (
              <Card key={signup.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{signup.userName}</p>
                      <p className="text-sm text-gray-600">{signup.userEmail}</p>
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Waitlisted
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
