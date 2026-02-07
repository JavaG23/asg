'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, User, Mail, Award, Camera, LogOut, HelpCircle, Key, ArrowRightLeft, Edit2, Phone, MapPin, Save, X, Clock } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'

interface ProfileStats {
  completedRoutes: number
  totalPickups: number
  totalVolunteerHours: string
}

interface ProfileData {
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
    changes: Record<string, { old: string | null; new: string | null }>
  } | null
}

export default function DriverProfile() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    phone: '',
    homeStreet: '',
    homeCity: '',
    homeState: '',
    homeZip: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchProfileData()
    }
  }, [status, router])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch stats
      const statsResponse = await fetch('/api/driver/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }

      // Fetch profile with pending changes
      const profileResponse = await fetch('/api/driver/profile')
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile(profileData.data)
        setEditForm({
          phone: profileData.data.phone || '',
          homeStreet: profileData.data.homeStreet || '',
          homeCity: profileData.data.homeCity || '',
          homeState: profileData.data.homeState || '',
          homeZip: profileData.data.homeZip || '',
        })
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    try {
      setUploading(true)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)

      setTimeout(() => {
        setUploading(false)
        alert('Profile picture updated! (Note: This is stored locally in your browser)')
      }, 1000)
    } catch (err) {
      console.error('Error uploading image:', err)
      alert('Failed to upload image')
      setUploading(false)
    }
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/driver/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save changes')
      }

      // Refresh profile data
      await fetchProfileData()
      setIsEditing(false)
      alert('Your changes have been submitted for admin approval.')
    } catch (err) {
      console.error('Error saving changes:', err)
      alert(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelPending = async () => {
    if (!confirm('Are you sure you want to cancel your pending changes?')) return

    try {
      const response = await fetch('/api/driver/profile', {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchProfileData()
        alert('Pending changes cancelled.')
      }
    } catch (err) {
      console.error('Error cancelling changes:', err)
    }
  }

  const handleBack = () => {
    router.push('/driver/dashboard')
  }

  // Check if user has multiple roles
  const user = session?.user as any
  const roles = {
    isAdmin: user?.isAdmin ?? false,
    isDriver: user?.isDriver ?? true,
    isDonor: user?.isDonor ?? false,
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
          <button onClick={handleBack} className="w-full mt-4 btn btn-primary">
            Go Back
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
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
            </div>
            <button
              onClick={() => router.push('/driver/help')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Help"
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
                        {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:{' '}
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

        {/* Profile Picture */}
        <div className="card text-center">
          <div className="relative inline-block">
            <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center mx-auto overflow-hidden">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-primary-600" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 transition-colors">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
          {uploading && (
            <p className="text-sm text-gray-600 mt-2">Uploading...</p>
          )}
        </div>

        {/* User Info */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Driver Information
            </h2>
            {!isEditing && !hasPendingChanges && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
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
                  <p className="font-medium text-gray-900">
                    {session?.user?.name || 'Driver'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Email (contact admin to change)</p>
                  <p className="font-medium text-gray-900">
                    {session?.user?.email}
                  </p>
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
                  Home Address
                </p>
                <div className="space-y-3">
                  <Input
                    label="Street Address"
                    value={editForm.homeStreet}
                    onChange={(e) => setEditForm({ ...editForm, homeStreet: e.target.value })}
                    placeholder="123 Main St"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="City"
                      value={editForm.homeCity}
                      onChange={(e) => setEditForm({ ...editForm, homeCity: e.target.value })}
                      placeholder="City"
                    />
                    <Input
                      label="State"
                      value={editForm.homeState}
                      onChange={(e) => setEditForm({ ...editForm, homeState: e.target.value })}
                      placeholder="NC"
                    />
                  </div>
                  <Input
                    label="ZIP Code"
                    value={editForm.homeZip}
                    onChange={(e) => setEditForm({ ...editForm, homeZip: e.target.value })}
                    placeholder="27601"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={handleSaveChanges}
                  loading={saving}
                  className="flex-1"
                >
                  <Save className="w-4 h-4" />
                  Submit for Approval
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false)
                    setEditForm({
                      phone: profile?.phone || '',
                      homeStreet: profile?.homeStreet || '',
                      homeCity: profile?.homeCity || '',
                      homeState: profile?.homeState || '',
                      homeZip: profile?.homeZip || '',
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
                  <p className="font-medium text-gray-900">
                    {session?.user?.name || 'Driver'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">
                    {session?.user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">
                    {profile?.phone || 'Not set'}
                  </p>
                </div>
              </div>

              {(profile?.homeStreet || profile?.homeCity) && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Home Address</p>
                    <p className="font-medium text-gray-900">
                      {profile?.homeStreet && <>{profile.homeStreet}<br /></>}
                      {profile?.homeCity}, {profile?.homeState} {profile?.homeZip}
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

        {/* Stats */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            ASG Statistics
          </h2>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.completedRoutes || 0}
                </p>
                <p className="text-sm text-gray-600">Routes Completed</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-success-50 to-success-100 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-success-600 flex items-center justify-center">
                <span className="text-xl font-bold text-white">📦</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalPickups || 0}
                </p>
                <p className="text-sm text-gray-600">Total Pick-ups</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-warning-50 to-warning-100 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-warning-600 flex items-center justify-center">
                <span className="text-xl font-bold text-white">⏱️</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalVolunteerHours || '0h'}
                </p>
                <p className="text-sm text-gray-600">Volunteer Hours</p>
              </div>
            </div>
          </div>
        </div>

        {/* Thank You Message */}
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
          <div className="text-center">
            <div className="text-4xl mb-2">💙</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Thank You!
            </h3>
            <p className="text-sm text-gray-700">
              Your dedication to A Simple Gesture makes a real difference in our
              community. We appreciate your volunteer service!
            </p>
          </div>
        </div>

        {/* Switch Role (only shown for users with multiple roles) */}
        {hasMultipleRoles && (
          <button
            onClick={() => router.push('/select-role')}
            className="w-full btn btn-primary py-3 flex items-center justify-center gap-2"
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
