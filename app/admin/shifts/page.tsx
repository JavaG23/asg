'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Clock, MapPin, Users, Trash2,  Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'

interface Shift {
  id: number
  date: string
  startTime: string
  endTime: string
  location: string
  spotsNeeded: number
  notes: string | null
  signupCounts: {
    pending: number
    approved: number
    waitlisted: number
  }
}

export default function AdminShiftsPage() {
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [newShift, setNewShift] = useState({
    date: '',
    startTime: '09:00',
    endTime: '12:00',
    location: 'Distribution Center',
    spotsNeeded: 5,
    notes: '',
  })

  useEffect(() => {
    fetchShifts()
  }, [])

  const fetchShifts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/shifts')
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

  const handleCreate = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/admin/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShift),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create shift')
      }

      await fetchShifts()
      setShowCreateModal(false)
      setNewShift({
        date: '',
        startTime: '09:00',
        endTime: '12:00',
        location: 'Distribution Center',
        spotsNeeded: 5,
        notes: '',
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create shift')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (shiftId: number) => {
    if (!confirm('Are you sure you want to delete this shift? This will also remove all signups.')) {
      return
    }

    setDeletingId(shiftId)
    try {
      const response = await fetch(`/api/admin/shifts/${shiftId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete shift')
      }

      await fetchShifts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete shift')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <Loading fullScreen text="Loading shifts..." />
  }

  const upcomingShifts = shifts.filter((s) => new Date(s.date) >= new Date())
  const pastShifts = shifts.filter((s) => new Date(s.date) < new Date())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Volunteer Shifts</h1>
          <p className="text-gray-600 mt-1">Manage distribution center volunteer shifts</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-5 h-5" />
          Create Shift
        </Button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {/* Upcoming Shifts */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Shifts</h2>
        {upcomingShifts.length > 0 ? (
          <div className="grid gap-4">
            {upcomingShifts.map((shift) => (
              <Card key={shift.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold text-gray-900">
                          {new Date(shift.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
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
                            <span className="text-yellow-600">
                              ({shift.signupCounts.pending} pending)
                            </span>
                          )}
                          {shift.signupCounts.waitlisted > 0 && (
                            <span className="text-gray-500">
                              ({shift.signupCounts.waitlisted} waitlisted)
                            </span>
                          )}
                        </div>
                      </div>
                      {shift.notes && (
                        <p className="mt-2 text-sm text-gray-500 italic">{shift.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/admin/shifts/${shift.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                        View
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
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No upcoming shifts scheduled</p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4" />
                Create First Shift
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Past Shifts */}
      {pastShifts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Shifts</h2>
          <div className="grid gap-4">
            {pastShifts.slice(0, 5).map((shift) => (
              <Card key={shift.id} className="opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-700">
                        {new Date(shift.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-gray-500 ml-2">
                        {shift.startTime} - {shift.endTime}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {shift.signupCounts.approved} volunteers
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Shift</h3>

            <div className="space-y-4">
              <Input
                label="Date"
                type="date"
                value={newShift.date}
                onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                  required
                />
                <Input
                  label="End Time"
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Location"
                value={newShift.location}
                onChange={(e) => setNewShift({ ...newShift, location: e.target.value })}
                required
              />

              <Input
                label="Spots Needed"
                type="number"
                min={1}
                value={newShift.spotsNeeded}
                onChange={(e) =>
                  setNewShift({ ...newShift, spotsNeeded: parseInt(e.target.value) || 1 })
                }
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={newShift.notes}
                  onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Any special instructions for volunteers..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleCreate}
                loading={creating}
                disabled={!newShift.date || !newShift.startTime || !newShift.endTime}
                className="flex-1"
              >
                Create Shift
              </Button>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
