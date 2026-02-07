'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { List, TruckIcon, User, HelpCircle, ArrowRightLeft } from 'lucide-react'
import RouteProgress from '@/components/driver/RouteProgress'
import AddressCard from '@/components/driver/AddressCard'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface RouteData {
  route: {
    id: number
    name: string
    date: string
    status: string
    totalStops: number
    completedStops: number
    progress: number
    nextStop: {
      id: number
      sequenceOrder: number
      streetAddress: string
      city: string
      state: string
      zipCode: string
      specialInstructions?: string | null
      status: string
    } | null
    addresses: Array<{
      id: number
      sequenceOrder: number
      streetAddress: string
      city: string
      state: string
      zipCode: string
      status: string
    }>
  }
}

export default function DriverDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const sessionUser = session?.user as any
  const hasMultipleRoles = [sessionUser?.isAdmin, sessionUser?.isDriver, sessionUser?.isDonor, sessionUser?.isVolunteer].filter(Boolean).length > 1
  const [routeData, setRouteData] = useState<RouteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchRouteData()
    }
  }, [status, router])

  const fetchRouteData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/driver/route')

      if (!response.ok) {
        if (response.status === 404) {
          // No active route - likely completed all routes
          router.push('/driver/complete')
          return
        } else {
          throw new Error('Failed to fetch route data')
        }
        return
      }

      const data = await response.json()
      setRouteData(data)
    } catch (err) {
      console.error('Error fetching route:', err)
      setError('Failed to load route data')
    } finally {
      setLoading(false)
    }
  }

  const handleStartNavigation = () => {
    if (routeData?.route.nextStop) {
      router.push(`/driver/route/${routeData.route.nextStop.id}`)
    }
  }

  const handleViewAllStops = () => {
    router.push(`/driver/route/all`)
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading your route..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorMessage message={error} />
          <button
            onClick={fetchRouteData}
            className="w-full mt-4 btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!routeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-6 h-6 text-primary-600" />
                <h1 className="text-xl font-bold text-gray-900">ASG Driver</h1>
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
                  onClick={() => router.push('/driver/help')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Help"
                >
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => router.push('/driver/profile')}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600">
                    {session?.user?.name || 'Profile'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 flex items-center justify-center">
          <div className="max-w-md w-full text-center">
            <TruckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Active Route
            </h2>
            <p className="text-gray-600 mb-6">
              You don't have an active route assigned yet. Please contact your
              administrator or check back later.
            </p>
            <button onClick={fetchRouteData} className="btn btn-primary mb-4">
              Refresh
            </button>
            <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => router.push('/driver/help')}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <HelpCircle className="w-4 h-4" />
                Help
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => router.push('/driver/profile')}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const { route } = routeData
  const isComplete = route.progress === 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{route.name}</h1>
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
                onClick={() => router.push('/driver/help')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Help"
              >
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => router.push('/driver/profile')}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-600">
                  {session?.user?.name || 'Driver'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4 pb-20">
        {/* Progress */}
        <RouteProgress
          completedStops={route.completedStops}
          totalStops={route.totalStops}
          progress={route.progress}
        />

        {/* Route Complete or Next Stop */}
        {isComplete ? (
          <div className="card bg-success-50 border-2 border-success-500 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-success-900 mb-2">
              Route Complete!
            </h2>
            <p className="text-success-700 mb-4">
              All {route.totalStops} pick-ups completed!
            </p>
            <p className="text-sm text-success-600 mb-6">
              Your volunteer hours have been automatically logged.
            </p>
            <button
              onClick={() => router.push('/driver/route/summary')}
              className="btn btn-primary w-full"
            >
              View Summary
            </button>
          </div>
        ) : route.nextStop ? (
          <>
            <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              📍 Next Stop
            </div>
            <AddressCard
              address={route.nextStop}
              isNextStop
              isFirstStop={route.completedStops === 0}
              onNavigate={handleStartNavigation}
            />
          </>
        ) : (
          <div className="card text-center">
            <p className="text-gray-600">
              All stops are either completed or skipped
            </p>
          </div>
        )}

        {/* Quick Actions */}
        {!isComplete && (
          <button
            onClick={handleViewAllStops}
            className="btn btn-secondary py-4 flex items-center justify-center gap-2"
          >
            <List className="w-5 h-5" />
            <span>View All Stops ({route.totalStops})</span>
          </button>
        )}
      </main>
    </div>
  )
}
