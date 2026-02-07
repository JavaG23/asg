'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Clock, Check, X, User, Phone, MapPin, ChevronDown, ChevronUp, Heart, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'

interface PendingChange {
  old: string | null
  new: string | null
}

interface UserWithPendingChanges {
  id: number
  name: string
  email: string
  phone: string | null
  homeStreet: string | null
  homeCity: string | null
  homeState: string | null
  homeZip: string | null
  pendingChanges: {
    submittedAt: string
    changes: Record<string, PendingChange>
  }
}

interface PendingApplication {
  id: number
  type: 'donor' | 'volunteer'
  email: string
  status: string
  submittedAt: string
  applicationData: {
    name: string
    email: string
    phone: string | null
    streetAddress?: string
    city?: string
    state?: string
    zipCode?: string
    notes?: string | null
  }
}

type TabType = 'profile' | 'donor' | 'volunteer'

export default function PendingChangesPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [users, setUsers] = useState<UserWithPendingChanges[]>([])
  const [donorApplications, setDonorApplications] = useState<PendingApplication[]>([])
  const [volunteerApplications, setVolunteerApplications] = useState<PendingApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchPendingChanges = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/pending-changes')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pending changes')
      }

      setUsers(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending changes')
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/admin/pending-onboarding')
      const data = await response.json()

      if (response.ok) {
        setDonorApplications(data.data.filter((a: PendingApplication) => a.type === 'donor'))
        setVolunteerApplications(data.data.filter((a: PendingApplication) => a.type === 'volunteer'))
      }
    } catch (err) {
      console.error('Error fetching applications:', err)
    }
  }

  useEffect(() => {
    fetchPendingChanges()
    fetchApplications()
  }, [])

  const handleAction = async (userId: number, action: 'approve' | 'reject') => {
    setProcessingId(userId)
    try {
      const adminUserId = session?.user ? parseInt((session.user as any).id) : null

      const response = await fetch('/api/admin/pending-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, adminUserId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} changes`)
      }

      // Remove from list
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} changes`)
    } finally {
      setProcessingId(null)
    }
  }

  const handleApplicationAction = async (applicationId: number, action: 'approve' | 'reject') => {
    setProcessingId(applicationId)
    try {
      const response = await fetch('/api/admin/pending-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} application`)
      }

      // Refresh applications
      await fetchApplications()
      alert(action === 'approve' ? 'Application approved! Welcome email sent.' : 'Application rejected.')
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} application`)
    } finally {
      setProcessingId(null)
    }
  }

  const formatFieldName = (field: string) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace('Home ', 'Home: ')
  }

  const formatUserId = (id: number) => `USR-${id.toString().padStart(5, '0')}`

  if (loading) {
    return <Loading fullScreen text="Loading pending changes..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Error Loading Pending Changes"
        message={error}
        onDismiss={() => setError(null)}
      />
    )
  }

  const totalPending = users.length + donorApplications.length + volunteerApplications.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Changes & Applications</h1>
        <p className="text-gray-600 mt-1">
          Review profile changes and new onboarding applications
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile Changes
            {users.length > 0 && (
              <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">
                {users.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('donor')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'donor'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Donor Applications
            {donorApplications.length > 0 && (
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                {donorApplications.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('volunteer')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'volunteer'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Volunteer Applications
            {volunteerApplications.length > 0 && (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                {volunteerApplications.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Profile Changes Tab */}
      {activeTab === 'profile' && (
        <>
          {users.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Check className="w-12 h-12 mx-auto mb-4 text-success-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Pending Changes
            </h3>
            <p className="text-gray-500">
              All profile change requests have been processed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <div
                  className="p-4 bg-warning-50 border-b border-warning-200 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning-200 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-warning-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <span className="text-xs font-mono text-gray-500">
                            {formatUserId(user.id)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        Submitted{' '}
                        {new Date(user.pendingChanges.submittedAt).toLocaleDateString()}
                      </span>
                      {expandedId === user.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === user.id && (
                  <div className="p-4 space-y-4">
                    {/* Current vs Proposed */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Current Values */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          Current Values
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(user.pendingChanges.changes).map(
                            ([field, change]) => (
                              <div key={field} className="text-sm">
                                <span className="text-gray-500">
                                  {formatFieldName(field)}:
                                </span>{' '}
                                <span className="text-gray-900">
                                  {change.old || '(not set)'}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Proposed Values */}
                      <div className="bg-primary-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-primary-700 mb-3">
                          Proposed Changes
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(user.pendingChanges.changes).map(
                            ([field, change]) => (
                              <div key={field} className="text-sm">
                                <span className="text-primary-600">
                                  {formatFieldName(field)}:
                                </span>{' '}
                                <span className="text-primary-900 font-medium">
                                  {change.new || '(clear)'}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2 border-t border-gray-200">
                      <Button
                        variant="primary"
                        onClick={() => handleAction(user.id, 'approve')}
                        loading={processingId === user.id}
                        className="flex-1"
                      >
                        <Check className="w-4 h-4" />
                        Approve Changes
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleAction(user.id, 'reject')}
                        disabled={processingId === user.id}
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      Approved changes will be applied immediately and synced to the database.
                      Home address changes will be geocoded for map display.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </>
      )}

      {/* Donor Applications Tab */}
      {activeTab === 'donor' && (
        <>
          {donorApplications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Check className="w-12 h-12 mx-auto mb-4 text-success-500" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Pending Donor Applications
                </h3>
                <p className="text-gray-500">
                  All donor applications have been processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {donorApplications.map((app) => (
                <Card key={app.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div
                      className="p-4 bg-red-50 border-b border-red-200 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center">
                            <Heart className="w-5 h-5 text-red-700" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{app.applicationData.name}</h3>
                            <p className="text-sm text-gray-600">{app.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Submitted {new Date(app.submittedAt).toLocaleDateString()}
                          </span>
                          {expandedId === app.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedId === app.id && (
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Info</h4>
                            <div className="space-y-2 text-sm">
                              <p><span className="text-gray-500">Name:</span> {app.applicationData.name}</p>
                              <p><span className="text-gray-500">Email:</span> {app.applicationData.email}</p>
                              <p><span className="text-gray-500">Phone:</span> {app.applicationData.phone || 'Not provided'}</p>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Pickup Address</h4>
                            <div className="text-sm">
                              <p>{app.applicationData.streetAddress}</p>
                              <p>{app.applicationData.city}, {app.applicationData.state} {app.applicationData.zipCode}</p>
                            </div>
                          </div>
                        </div>
                        {app.applicationData.notes && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                            <p className="text-sm text-gray-600">{app.applicationData.notes}</p>
                          </div>
                        )}

                        <div className="flex gap-3 pt-2 border-t border-gray-200">
                          <Button
                            variant="primary"
                            onClick={() => handleApplicationAction(app.id, 'approve')}
                            loading={processingId === app.id}
                            className="flex-1 bg-red-500 hover:bg-red-600"
                          >
                            <Check className="w-4 h-4" />
                            Approve & Send Welcome
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => handleApplicationAction(app.id, 'reject')}
                            disabled={processingId === app.id}
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Volunteer Applications Tab */}
      {activeTab === 'volunteer' && (
        <>
          {volunteerApplications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Check className="w-12 h-12 mx-auto mb-4 text-success-500" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Pending Volunteer Applications
                </h3>
                <p className="text-gray-500">
                  All volunteer applications have been processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {volunteerApplications.map((app) => (
                <Card key={app.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div
                      className="p-4 bg-green-50 border-b border-green-200 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-green-700" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{app.applicationData.name}</h3>
                            <p className="text-sm text-gray-600">{app.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Submitted {new Date(app.submittedAt).toLocaleDateString()}
                          </span>
                          {expandedId === app.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedId === app.id && (
                      <div className="p-4 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Info</h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Name:</span> {app.applicationData.name}</p>
                            <p><span className="text-gray-500">Email:</span> {app.applicationData.email}</p>
                            <p><span className="text-gray-500">Phone:</span> {app.applicationData.phone || 'Not provided'}</p>
                          </div>
                        </div>
                        {app.applicationData.notes && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                            <p className="text-sm text-gray-600">{app.applicationData.notes}</p>
                          </div>
                        )}

                        <div className="flex gap-3 pt-2 border-t border-gray-200">
                          <Button
                            variant="primary"
                            onClick={() => handleApplicationAction(app.id, 'approve')}
                            loading={processingId === app.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                            Approve & Send Welcome
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => handleApplicationAction(app.id, 'reject')}
                            disabled={processingId === app.id}
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
