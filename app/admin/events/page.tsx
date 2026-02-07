'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, Clock, Users, Trash2, Edit, Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'

interface PickupEvent {
  id: number
  date: string
  description: string | null
  optInDeadline: string | null
  optInCount: number
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<PickupEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [newEvent, setNewEvent] = useState({
    date: '',
    description: '',
    optInDeadline: '',
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/events')
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

  const handleCreate = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event')
      }

      await fetchEvents()
      setShowCreateModal(false)
      setNewEvent({
        date: '',
        description: '',
        optInDeadline: '',
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this pickup event? This will also remove all opt-ins.')) {
      return
    }

    setDeletingId(eventId)
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete event')
      }

      await fetchEvents()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete event')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <Loading fullScreen text="Loading pickup events..." />
  }

  const upcomingEvents = events.filter((e) => new Date(e.date) >= new Date())
  const pastEvents = events.filter((e) => new Date(e.date) < new Date())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pickup Events</h1>
          <p className="text-gray-600 mt-1">Manage food donation pickup dates</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-5 h-5" />
          Create Event
        </Button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {/* Upcoming Events */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Pickup Dates</h2>
        {upcomingEvents.length > 0 ? (
          <div className="grid gap-4">
            {upcomingEvents.map((event) => (
              <Card key={event.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-red-400" />
                        <span className="font-semibold text-gray-900">
                          {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4" />
                          {event.optInCount} donors opted in
                        </div>
                        {event.optInDeadline && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Opt-in deadline:{' '}
                            {new Date(event.optInDeadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-2 text-sm text-gray-500 italic">{event.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDelete(event.id)}
                        loading={deletingId === event.id}
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
              <p>No upcoming pickup events scheduled</p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4" />
                Create First Event
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Events</h2>
          <div className="grid gap-4">
            {pastEvents.slice(0, 5).map((event) => (
              <Card key={event.id} className="opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-700">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {event.optInCount} donors
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Pickup Event</h3>

            <div className="space-y-4">
              <Input
                label="Pickup Date"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                required
              />

              <Input
                label="Opt-In Deadline (Optional)"
                type="date"
                value={newEvent.optInDeadline}
                onChange={(e) => setNewEvent({ ...newEvent, optInDeadline: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Special instructions or notes for this pickup date..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={handleCreate}
                loading={creating}
                disabled={!newEvent.date}
                className="flex-1"
              >
                Create Event
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
