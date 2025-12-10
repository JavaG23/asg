'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, User, Mail, Award, Camera, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface ProfileStats {
  completedRoutes: number
  totalPickups: number
  totalVolunteerHours: string
}

export default function DriverProfile() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchProfileStats()
    }
  }, [status, router])

  const fetchProfileStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/driver/stats')

      if (!response.ok) {
        throw new Error('Failed to fetch profile stats')
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    try {
      setUploading(true)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)

      // In production, this would upload to a server or cloud storage
      // For now, we'll just store it locally in the browser
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

  const handleBack = () => {
    router.push('/driver/dashboard')
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto space-y-4">
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
          <h2 className="text-lg font-semibold text-gray-900">
            Driver Information
          </h2>

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
          </div>
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
