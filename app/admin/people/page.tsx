'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Users, Mail, Phone, Route, TrendingUp, Shield, Key, Edit2, Truck, Heart, Trash2, CheckSquare, Square } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Select } from '@/components/shared/Input'
import { Button } from '@/components/shared/Button'
import { UserEditModal } from '@/components/admin/UserEditModal'

interface UserData {
  id: number
  name: string
  email: string
  phone?: string | null
  role: string // Legacy field for backward compatibility
  isAdmin: boolean
  isDriver: boolean
  isDonor: boolean
  isVolunteer: boolean
  active: boolean
  hasPassword?: boolean
  bloomerangId?: string | null
  homeStreet?: string | null
  homeCity?: string | null
  homeState?: string | null
  homeZip?: string | null
  stats?: {
    totalRoutes: number
    completedRoutes: number
    totalDeliveries: number
  }
}

export default function DriversPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all users including admins
      const response = await fetch('/api/drivers?includeAll=true')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users')
      }

      setUsers(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user)
    setEditModalOpen(true)
  }

  const handleSaveUser = async (userData: UserData) => {
    const response = await fetch(`/api/users/${userData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update user')
    }

    // Refresh the list
    fetchUsers()
  }

  const handleSendPasswordReset = async (userId: number) => {
    const response = await fetch('/api/auth/send-password-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverIds: [userId] }),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to send password reset')
    }

    alert('Password reset email sent!')
  }

  const handleDeleteUser = async (userId: number, hardDelete: boolean) => {
    const url = hardDelete
      ? `/api/users/${userId}?hard=true`
      : `/api/users/${userId}`

    const response = await fetch(url, {
      method: 'DELETE',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete user')
    }

    // Refresh the list
    fetchUsers()
    alert(result.message)
  }

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const selectAllFiltered = () => {
    // Select all filtered users except current user
    const ids = filteredUsers
      .filter(u => u.id !== currentUserId)
      .map(u => u.id)
    setSelectedUserIds(new Set(ids))
  }

  const deselectAll = () => {
    setSelectedUserIds(new Set())
  }

  const handleBulkDelete = async (hardDelete: boolean) => {
    if (selectedUserIds.size === 0) return

    const confirmMsg = hardDelete
      ? `Are you sure you want to PERMANENTLY DELETE ${selectedUserIds.size} user(s)? This cannot be undone.`
      : `Are you sure you want to deactivate ${selectedUserIds.size} user(s)?`

    if (!confirm(confirmMsg)) return

    setBulkDeleting(true)
    let successCount = 0
    let errorCount = 0

    for (const userId of selectedUserIds) {
      try {
        const url = hardDelete
          ? `/api/users/${userId}?hard=true`
          : `/api/users/${userId}`

        const response = await fetch(url, { method: 'DELETE' })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch (err) {
        errorCount++
      }
    }

    setBulkDeleting(false)
    setSelectedUserIds(new Set())
    fetchUsers()

    if (errorCount > 0) {
      alert(`Completed: ${successCount} succeeded, ${errorCount} failed`)
    } else {
      alert(`Successfully ${hardDelete ? 'deleted' : 'deactivated'} ${successCount} user(s)`)
    }
  }

  const currentUserId = session?.user ? parseInt((session.user as any).id) : undefined

  // Format user ID as "USR-00042"
  const formatUserId = (id: number) => `USR-${id.toString().padStart(5, '0')}`

  // Filter users by role (using boolean fields)
  const filteredUsers = users.filter(user => {
    if (roleFilter === 'all') return true
    if (roleFilter === 'admin') return user.isAdmin
    if (roleFilter === 'driver') return user.isDriver
    if (roleFilter === 'donor') return user.isDonor
    if (roleFilter === 'volunteer') return user.isVolunteer
    if (roleFilter === 'active') return user.active
    if (roleFilter === 'inactive') return !user.active
    return true
  })

  if (loading) {
    return <Loading fullScreen text="Loading users..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Error Loading Users"
        message={error}
        onDismiss={() => setError(null)}
      />
    )
  }

  const adminCount = users.filter(u => u.isAdmin).length
  const driverCount = users.filter(u => u.isDriver).length
  const donorCount = users.filter(u => u.isDonor).length
  const volunteerCount = users.filter(u => u.isVolunteer).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage drivers and administrators</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedUserIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedUserIds.size} selected
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkDelete(false)}
                disabled={bulkDeleting}
              >
                Deactivate
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleBulkDelete(true)}
                disabled={bulkDeleting}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={deselectAll}
                disabled={bulkDeleting}
              >
                Cancel
              </Button>
            </div>
          )}
          <Select
            label=""
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Users' },
              { value: 'driver', label: 'Drivers' },
              { value: 'admin', label: 'Admins' },
              { value: 'donor', label: 'Donors' },
              { value: 'volunteer', label: 'Volunteers' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive Only' },
            ]}
            className="w-40"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary-50">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Admins</p>
                <p className="text-3xl font-bold text-gray-900">{adminCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Drivers</p>
                <p className="text-3xl font-bold text-gray-900">{driverCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-success-50">
                <TrendingUp className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Routes</p>
                <p className="text-3xl font-bold text-gray-900">
                  {users.reduce((sum, d) => sum + (d.stats?.totalRoutes || 0), 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50">
                <Route className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selection Controls */}
      {filteredUsers.length > 0 && (
        <div className="flex items-center gap-4">
          <button
            onClick={selectedUserIds.size === filteredUsers.filter(u => u.id !== currentUserId).length ? deselectAll : selectAllFiltered}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {selectedUserIds.size === filteredUsers.filter(u => u.id !== currentUserId).length ? (
              <>
                <CheckSquare className="w-4 h-4" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="w-4 h-4" />
                Select All
              </>
            )}
          </button>
          {selectedUserIds.size > 0 && (
            <span className="text-sm text-gray-500">
              ({selectedUserIds.size} of {filteredUsers.length} selected)
            </span>
          )}
        </div>
      )}

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => {
          const isSelected = selectedUserIds.has(user.id)
          const isCurrentUser = user.id === currentUserId
          return (
          <Card key={user.id} className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50/30' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                {/* Checkbox */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isCurrentUser) toggleUserSelection(user.id)
                    }}
                    className={`mt-1 flex-shrink-0 ${isCurrentUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    disabled={isCurrentUser}
                    title={isCurrentUser ? "Cannot delete yourself" : "Select for bulk action"}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-primary-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleEditUser(user)}
                  >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      user.isAdmin ? 'bg-purple-100' : 'bg-primary-100'
                    }`}>
                      {user.isAdmin ? (
                        <Shield className="w-6 h-6 text-purple-600" />
                      ) : (
                        <Users className="w-6 h-6 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                        <span className="px-2 py-0.5 text-xs font-mono bg-gray-200 text-gray-600 rounded">
                          {formatUserId(user.id)}
                        </span>
                        {/* Role badges */}
                        {user.isAdmin && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                        {user.isDriver && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700 flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            Driver
                          </span>
                        )}
                        {user.isDonor && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            Donor
                          </span>
                        )}
                        {user.isVolunteer && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Volunteer
                          </span>
                        )}
                        {!user.hasPassword && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-warning-100 text-warning-700 flex items-center gap-1">
                            <Key className="w-3 h-3" />
                            No Password
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {user.stats && (
                    <div className="flex gap-6 text-sm ml-15">
                      <div>
                        <p className="text-gray-600">Total Routes</p>
                        <p className="text-xl font-bold text-gray-900">{user.stats.totalRoutes}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Completed</p>
                        <p className="text-xl font-bold text-success-600">{user.stats.completedRoutes}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Pickups</p>
                        <p className="text-xl font-bold text-primary-600">{user.stats.totalDeliveries}</p>
                      </div>
                    </div>
                  )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    user.active
                      ? 'bg-success-100 text-success-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditUser(user)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit user"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
          )
        })}

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">
                {roleFilter !== 'all' ? 'Try changing the filter' : 'No users in the system'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      <UserEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
        onSave={handleSaveUser}
        onSendPasswordReset={handleSendPasswordReset}
        onDelete={handleDeleteUser}
        currentUserId={currentUserId}
      />
    </div>
  )
}
