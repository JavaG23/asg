'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, User, Mail, Phone, Key, HelpCircle, ArrowRightLeft, LogOut, Award, Clock } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface ProfileData {
  id: number
  name: string
  email: string
  phone: string | null
  totalHours: number
  totalShifts: number
}

export default function VolunteerProfilePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      const response = await fetch('/api/volunteer/profile')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile')
      }

      setProfile(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  // Check if user has multiple roles
  const user = session?.user as any
  const roles = {
    isAdmin: user?.isAdmin ?? false,
    isDriver: user?.isDriver ?? false,
    isDonor: user?.isDonor ?? false,
    isVolunteer: user?.isVolunteer ?? true,
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
              <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
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
      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Profile Picture */}
        <div className="card text-center">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <User className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mt-4">{profile?.name}</h2>
          <p className="text-sm text-gray-500">Volunteer</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center bg-green-50 border-green-200">
            <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {profile?.totalHours.toFixed(1) || 0}
            </p>
            <p className="text-sm text-gray-600">Total Hours</p>
          </div>
          <div className="card text-center bg-blue-50 border-blue-200">
            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{profile?.totalShifts || 0}</p>
            <p className="text-sm text-gray-600">Total Shifts</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="card space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>

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

        {/* Thank You Message */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="text-center">
            <div className="text-4xl mb-2">🙏</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Thank You!</h3>
            <p className="text-sm text-gray-700">
              Your dedication to A Simple Gesture makes a real difference in our community.
              Every hour you volunteer helps feed families in need!
            </p>
          </div>
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
