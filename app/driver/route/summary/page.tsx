'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Trophy, Clock, CheckCircle, Home } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface RouteData {
  route: {
    id: number
    name: string
    date: string
    totalStops: number
    completedStops: number
    addresses: Array<{
      status: string
      deliveryLog?: {
        completedAt: string
      } | null
    }>
  }
}

export default function RouteSummary() {
  const router = useRouter()
  const { status } = useSession()
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
        throw new Error('Failed to fetch route data')
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

  const calculateDuration = () => {
    if (!routeData) return '0h 0m'

    const completedLogs = routeData.route.addresses
      .filter((addr) => addr.deliveryLog)
      .map((addr) => new Date(addr.deliveryLog!.completedAt))

    if (completedLogs.length === 0) return '0h 0m'

    const earliest = new Date(Math.min(...completedLogs.map((d) => d.getTime())))
    const latest = new Date(Math.max(...completedLogs.map((d) => d.getTime())))
    const diffMs = latest.getTime() - earliest.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m`
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading summary..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorMessage message={error} />
        </div>
      </div>
    )
  }

  if (!routeData) {
    return null
  }

  const { route } = routeData
  const skippedCount = route.addresses.filter(
    (addr) => addr.status === 'skipped'
  ).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Celebration */}
        <div className="text-center">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Route Complete!
          </h1>
          <p className="text-gray-600">Great job completing your pick-ups!</p>
        </div>

        {/* Stats Card */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <CheckCircle className="w-6 h-6 text-success-600" />
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900">
                {route.completedStops}
              </div>
              <div className="text-sm text-gray-600">Stops Completed</div>
            </div>
          </div>

          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <Clock className="w-6 h-6 text-primary-600" />
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900">
                {calculateDuration()}
              </div>
              <div className="text-sm text-gray-600">Total Time</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-warning-600" />
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900">
                {route.name}
              </div>
              <div className="text-sm text-gray-600">Route Completed</div>
            </div>
          </div>

          {skippedCount > 0 && (
            <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
              <p className="text-sm text-warning-800">
                {skippedCount} {skippedCount === 1 ? 'stop was' : 'stops were'}{' '}
                skipped
              </p>
            </div>
          )}
        </div>

        {/* Bloomerang Message */}
        <div className="card bg-info-50 border border-info-200">
          <p className="text-sm text-info-900 text-center">
            ✓ Your volunteer hours have been automatically logged to Bloomerang
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/driver/route/all')}
            className="w-full btn btn-secondary py-3"
          >
            View All Stops
          </button>
          <button
            onClick={() => router.push('/driver/dashboard')}
            className="w-full btn btn-primary py-3 flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
