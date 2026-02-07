'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, User, Mail, Phone, MapPin, Save, X, Clock, Key, Edit2, HelpCircle, ArrowRightLeft, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'

interface ProfileData {
  id: number
  name: string
  email: string
  phone: string | null
  address: {
    streetAddress: string
    city: string
    state: string
    zipCode: string
  } | null
  pendingChanges: {
    submittedAt: string
    changes: Record<string, { old: string | null; new: string | null }>
  } | null
}

export default function DonorProfilePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/donor/profile')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile')
      }

      setProfile(data.data)
      setEditForm({
        phone: data.data.phone || '',
        streetAddress: data.data.address?.streetAddress || '',
        city: data.data.address?.city || '',
        state: data.data.address?.state || '',
        zipCode: data.data.address?.zipCode || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/donor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save changes')
      }

      await fetchProfile()
      setIsEditing(false)
      alert('Your changes have been submitted for admin approval.')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelPending = async () => {
    if (!confirm('Are you sure you want to cancel your pending changes?')) return

    try {
      const response = await fetch('/api/donor/profile', {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchProfile()
        alert('Pending changes cancelled.')
      }
    } catch (err) {
      console.error('Error cancelling changes:', err)
    }
  }

  // Check if user has multiple roles
  const user = session?.user as any
  const roles = {
    isAdmin: user?.isAdmin ?? false,
    isDriver: user?.isDriver ?? false,
    isDonor: user?.isDonor ?? true,
    isVolunteer: user?.isVolunteer ?? false,
  }
  const roleCount = Object.values(roles).filter(Boolean).length
  const hasMultipleRoles = roleCount > 1

  if (status === 'loading' || loading) {
    return <Loading text="Loading profile..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorMessage message={error} />
          <button onClick={fetchProfile} className="w-full mt-4 btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const hasPendingChanges = profile?.pendingChanges !== null

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
              <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
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
      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Pending Changes Banner */}
        {hasPendingChanges && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-warning-900">Changes Pending Approval</p>
                <p className="text-sm text-warning-700 mt-1">
                  You have profile changes waiting for admin review. Submitted{' '}
                  {new Date(profile!.pendingChanges!.submittedAt).toLocaleDateString()}.
                </p>
                <div className="mt-2 text-sm text-warning-800">
                  <p className="font-medium">Requested changes:</p>
                  <ul className="list-disc list-inside mt-1">
                    {Object.entries(profile!.pendingChanges!.changes).map(([field, change]) => (
                      <li key={field}>
                        {field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}:{' '}
                        <span className="line-through text-warning-600">{change.old || '(empty)'}</span>
                        {' → '}
                        <span className="font-medium">{change.new || '(empty)'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={handleCancelPending}
                  className="mt-2 text-sm text-warning-700 underline hover:text-warning-900"
                >
                  Cancel pending changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
            {!isEditing && !hasPendingChanges && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Name (contact admin to change)</p>
                  <p className="font-medium text-gray-900">{profile?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Email (contact admin to change)</p>
                  <p className="font-medium text-gray-900">{profile?.email}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Pickup Address
                </p>
                <div className="space-y-3">
                  <Input
                    label="Street Address"
                    value={editForm.streetAddress}
                    onChange={(e) => setEditForm({ ...editForm, streetAddress: e.target.value })}
                    placeholder="123 Main St"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="City"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      placeholder="City"
                    />
                    <Input
                      label="State"
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      placeholder="NC"
                    />
                  </div>
                  <Input
                    label="ZIP Code"
                    value={editForm.zipCode}
                    onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                    placeholder="27601"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="primary" onClick={handleSaveChanges} loading={saving} className="flex-1">
                  <Save className="w-4 h-4" />
                  Submit for Approval
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false)
                    setEditForm({
                      phone: profile?.phone || '',
                      streetAddress: profile?.address?.streetAddress || '',
                      city: profile?.address?.city || '',
                      state: profile?.address?.state || '',
                      zipCode: profile?.address?.zipCode || '',
                    })
                  }}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Changes require admin approval before taking effect.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{profile?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{profile?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{profile?.phone || 'Not set'}</p>
                </div>
              </div>

              {profile?.address && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Pickup Address</p>
                    <p className="font-medium text-gray-900">
                      {profile.address.streetAddress}
                      <br />
                      {profile.address.city}, {profile.address.state} {profile.address.zipCode}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => router.push('/forgot-password')}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <Key className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Change Password</p>
                  <p className="text-xs text-gray-500">Update your login password</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Switch Role */}
        {hasMultipleRoles && (
          <button
            onClick={() => router.push('/select-role')}
            className="w-full btn bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 flex items-center justify-center gap-2"
          >
            <ArrowRightLeft className="w-5 h-5" />
            Switch Role
          </button>
        )}

        {/* Sign Out */}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full btn btn-secondary py-3 flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </main>
    </div>
  )
}
