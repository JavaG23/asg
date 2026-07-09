'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Users, Clock, Calendar, History, User, HelpCircle, ArrowRightLeft, LogOut, Play, Square, MapPin } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'

interface ActiveSession {
  id: number
  clockIn: string
  shiftId: number | null
  shiftLocation: string | null
}

interface UpcomingShift {
  id: number
  date: string
  startTime: string
  endTime: string
  location: string
  status: string
}

interface DashboardData {
  user: {
    id: number
    name: string
    email: string
  }
  activeSession: ActiveSession | null
  upcomingShifts: UpcomingShift[]
  totalHours: number
  shiftsThisMonth: number
}

export default function VolunteerDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clockingIn, setClockingIn] = useState(false)
  const [clockingOut, setClockingOut] = useState(false)
  const [elapsedTime, setElapsedTime] = useState<string>('0:00')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status, router])

  // Timer for active session
  useEffect(() => {
    if (!dashboardData?.activeSession) return

    const updateElapsed = () => {
      const clockIn = new Date(dashboardData.activeSession!.clockIn)
      const now = new Date()
      const diff = Math.floor((now.getTime() - clockIn.getTime()) / 1000)
      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}`)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [dashboardData?.activeSession])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/volunteer/dashboard')
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

  const handleClockIn = async () => {
    setClockingIn(true)
    try {
      const response = await fetch('/api/volunteer/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clockIn' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock in')
      }

      await fetchDashboardData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to clock in')
    } finally {
      setClockingIn(false)
    }
  }

  const handleClockOut = async () => {
    const notes = prompt('Any notes about your shift? (optional)')

    setClockingOut(true)
    try {
      const response = await fetch('/api/volunteer/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clockOut', notes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock out')
      }

      await fetchDashboardData()
      alert(`Clocked out! Total time: ${data.data.totalMinutes} minutes`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to clock out')
    } finally {
      setClockingOut(false)
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

  const hasActiveSession = dashboardData?.activeSession !== null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-green-600" />
              <h1 className="text-xl font-bold text-gray-900">Volunteer Dashboard</h1>
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
                onClick={() => router.push('/volunteer/help')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Help"
              >
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => router.push('/volunteer/profile')}
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
        {/* Clock In/Out Card */}
        {/* NOTE (65l): this clock-in/out is NOT tied to any specific shift/opportunity — it
            just opens a bare VolunteerSession. TODO: only render it when the user is signed up
            for an opportunity shift dated today (same date as login); hide it otherwise. */}
        <div className={`card ${hasActiveSession ? 'bg-green-50 border-2 border-green-300' : ''}`}>
          {hasActiveSession ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium text-green-700">Currently Clocked In</span>
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">{elapsedTime}</p>
              <p className="text-sm text-gray-600 mb-4">
                Started at {new Date(dashboardData!.activeSession!.clockIn).toLocaleTimeString()}
                {dashboardData!.activeSession!.shiftLocation && (
                  <span className="flex items-center justify-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {dashboardData!.activeSession!.shiftLocation}
                  </span>
                )}
              </p>
              <Button
                variant="primary"
                onClick={handleClockOut}
                loading={clockingOut}
                className="bg-red-500 hover:bg-red-600"
              >
                <Square className="w-5 h-5" />
                Clock Out
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">Ready to start your shift?</p>
              <Button
                variant="primary"
                onClick={handleClockIn}
                loading={clockingIn}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-5 h-5" />
                Clock In
              </Button>
            </div>
          )}
        </div>

        {/* Stats moved to the profile page (65l) — lifetime Total Hours / Total Shifts
            already live there; keeping them off the landing/dash to declutter. */}

        {/* Upcoming Opportunities */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Upcoming Opportunities
            </h3>
            <button
              onClick={() => router.push('/volunteer/shifts')}
              className="text-sm text-green-600 hover:text-green-700"
            >
              Browse Shifts
            </button>
          </div>

          {dashboardData?.upcomingShifts && dashboardData.upcomingShifts.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.upcomingShifts.slice(0, 3).map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(shift.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {shift.startTime} - {shift.endTime}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {shift.location}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      shift.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : shift.status === 'waitlisted'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No upcoming opportunities</p>
              <button
                onClick={() => router.push('/volunteer/shifts')}
                className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Find shifts to sign up for
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/volunteer/my-opportunities')}
            className="card hover:bg-gray-50 transition-colors text-left"
          >
            <Users className="w-8 h-8 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">Opportunities</p>
            <p className="text-xs text-gray-500">Browse ways to volunteer</p>
          </button>
          <button
            onClick={() => router.push('/volunteer/opportunities')}
            className="card hover:bg-gray-50 transition-colors text-left"
          >
            <Calendar className="w-8 h-8 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">Calendar</p>
            <p className="text-xs text-gray-500">Browse & sign up</p>
          </button>
          <button
            onClick={() => router.push('/volunteer/hours')}
            className="card hover:bg-gray-50 transition-colors text-left"
          >
            <History className="w-8 h-8 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">My Hours</p>
            <p className="text-xs text-gray-500">View hour log</p>
          </button>
          <button
            onClick={() => router.push('/volunteer/shifts')}
            className="card hover:bg-gray-50 transition-colors text-left"
          >
            <Clock className="w-8 h-8 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">All Shifts</p>
            <p className="text-xs text-gray-500">Classic shift list</p>
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
