'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Heart, Calendar, History, User, HelpCircle, ArrowRightLeft, LogOut, Clock, CheckCircle, MapPin } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface UpcomingPickup {
  id: number
  date: string
  status: string
  reminderPreference: string
}

interface DashboardData {
  donor: {
    id: number
    name: string
    email: string
    address: {
      streetAddress: string
      city: string
      state: string
      zipCode: string
    } | null
  }
  upcomingPickups: UpcomingPickup[]
  totalDonations: number
  lastDonationDate: string | null
}

export default function DonorDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status, router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/donor/dashboard')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard data')
      }

      setDashboardData(data.data)
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
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
    return <Loading text="Loading your dashboard..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorMessage message={error} />
          <button onClick={fetchDashboardData} className="w-full mt-4 btn btn-primary">
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
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500" />
              <h1 className="text-xl font-bold text-gray-900">Donor Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              {hasMultipleRoles && (
                <button
                  onClick={() => router.push('/select-role')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Switch Role"
                >
                  <ArrowRightLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <button
                onClick={() => router.push('/donor/help')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Help"
              >
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => router.push('/donor/profile')}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {session?.user?.name || 'Profile'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Welcome Card */}
        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Welcome, {dashboardData?.donor?.name || session?.user?.name}!
              </h2>
              <p className="text-sm text-gray-600">
                Thank you for being part of A Simple Gesture.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-600">
              {dashboardData?.totalDonations || 0}
            </p>
            <p className="text-sm text-gray-600">Total Donations</p>
          </div>
          <div className="card text-center">
            <p className="text-lg font-semibold text-gray-900">
              {dashboardData?.lastDonationDate
                ? new Date(dashboardData.lastDonationDate).toLocaleDateString()
                : 'None yet'}
            </p>
            <p className="text-sm text-gray-600">Last Donation</p>
          </div>
        </div>

        {/* Your Address */}
        {dashboardData?.donor?.address && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              Pickup Address
            </h3>
            <p className="text-gray-600">
              {dashboardData.donor.address.streetAddress}<br />
              {dashboardData.donor.address.city}, {dashboardData.donor.address.state} {dashboardData.donor.address.zipCode}
            </p>
          </div>
        )}

        {/* Upcoming Pickups */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Upcoming Pickups
            </h3>
            <button
              onClick={() => router.push('/donor/pickups')}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Manage Pickups
            </button>
          </div>

          {dashboardData?.upcomingPickups && dashboardData.upcomingPickups.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.upcomingPickups.slice(0, 3).map((pickup) => (
                <div
                  key={pickup.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(pickup.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Reminder: {pickup.reminderPreference === 'none' ? 'Off' : pickup.reminderPreference}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Opted In
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No upcoming pickups scheduled</p>
              <button
                onClick={() => router.push('/donor/pickups')}
                className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Opt-in to pickup dates
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/donor/pickups')}
            className="card hover:bg-gray-50 transition-colors text-left"
          >
            <Calendar className="w-8 h-8 text-red-500 mb-2" />
            <p className="font-medium text-gray-900">Schedule Pickups</p>
            <p className="text-xs text-gray-500">Opt-in to dates</p>
          </button>
          <button
            onClick={() => router.push('/donor/history')}
            className="card hover:bg-gray-50 transition-colors text-left"
          >
            <History className="w-8 h-8 text-red-500 mb-2" />
            <p className="font-medium text-gray-900">Donation History</p>
            <p className="text-xs text-gray-500">View past donations</p>
          </button>
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
