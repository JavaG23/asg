'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Users, Mail, Phone, Route, TrendingUp, Shield, Key, Edit2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Select } from '@/components/shared/Input'
import { UserEditModal } from '@/components/admin/UserEditModal'

interface UserData {
  id: number
  name: string
  email: string
  phone?: string | null
  role: string
  active: boolean
  hasPassword?: boolean
  bloomerangId?: string | null
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

  const currentUserId = session?.user ? parseInt((session.user as any).id) : undefined

  // Format user ID as "USR-00042"
  const formatUserId = (id: number) => `USR-${id.toString().padStart(5, '0')}`

  // Filter users by role
  const filteredUsers = users.filter(user => {
    if (roleFilter === 'all') return true
    if (roleFilter === 'admin') return user.role === 'admin'
    if (roleFilter === 'driver') return user.role === 'driver'
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

  const adminCount = users.filter(u => u.role === 'admin').length
  const driverCount = users.filter(u => u.role === 'driver').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage drivers and administrators</p>
        </div>
        <Select
          label=""
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Users' },
            { value: 'driver', label: 'Drivers Only' },
            { value: 'admin', label: 'Admins Only' },
            { value: 'active', label: 'Active Only' },
            { value: 'inactive', label: 'Inactive Only' },
          ]}
          className="w-40"
        />
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

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleEditUser(user)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      user.role === 'admin' ? 'bg-purple-100' : 'bg-primary-100'
                    }`}>
                      {user.role === 'admin' ? (
                        <Shield className="w-6 h-6 text-purple-600" />
                      ) : (
                        <Users className="w-6 h-6 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                        <span className="px-2 py-0.5 text-xs font-mono bg-gray-200 text-gray-600 rounded">
                          {formatUserId(user.id)}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Driver'}
                        </span>
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

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    user.active
                      ? 'bg-success-100 text-success-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleEditUser(user)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit user"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

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
        currentUserId={currentUserId}
      />
    </div>
  )
}
