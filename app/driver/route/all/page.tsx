'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, CheckCircle, Circle, XCircle, MapPin } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface RouteData {
  route: {
    id: number
    name: string
    totalStops: number
    completedStops: number
    addresses: Array<{
      id: number
      sequenceOrder: number
      streetAddress: string
      city: string
      state: string
      zipCode: string
      status: string
      specialInstructions?: string | null
      deliveryLog?: {
        completedAt: string
      } | null
    }>
  }
}

export default function AllStops() {
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

  const handleBack = () => {
    router.push('/driver/dashboard')
  }

  const handleAddressClick = (addressId: number, status: string) => {
    if (status === 'pending') {
      router.push(`/driver/route/${addressId}`)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading stops..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorMessage message={error} />
          <div className="flex gap-3 mt-4">
            <button onClick={handleBack} className="flex-1 btn btn-secondary">
              Go Back
            </button>
            <button
              onClick={fetchRouteData}
              className="flex-1 btn btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!routeData) {
    return null
  }

  const { route } = routeData

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
            <h1 className="text-xl font-bold text-gray-900">
              All Stops ({route.totalStops})
            </h1>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {route.completedStops} completed, {route.totalStops - route.completedStops} remaining
          </div>
        </div>
      </header>

      {/* Stops List */}
      <main className="p-4 space-y-3">
        {route.addresses.map((address) => {
          const isPending = address.status === 'pending'
          const isCompleted = address.status === 'completed'
          const isSkipped = address.status === 'skipped'

          let StatusIcon = Circle
          let statusColor = 'text-gray-400'
          let bgColor = 'bg-white'
          let borderColor = 'border-gray-200'

          if (isCompleted) {
            StatusIcon = CheckCircle
            statusColor = 'text-success-600'
            bgColor = 'bg-success-50'
            borderColor = 'border-success-200'
          } else if (isSkipped) {
            StatusIcon = XCircle
            statusColor = 'text-warning-600'
            bgColor = 'bg-warning-50'
            borderColor = 'border-warning-200'
          }

          return (
            <div
              key={address.id}
              onClick={() =>
                handleAddressClick(address.id, address.status)
              }
              className={`card ${bgColor} border ${borderColor} ${
                isPending ? 'cursor-pointer hover:shadow-md' : ''
              } transition-all`}
            >
              <div className="flex items-start gap-3">
                <StatusIcon className={`w-6 h-6 mt-0.5 flex-shrink-0 ${statusColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-700">
                      {address.sequenceOrder}.
                    </span>
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {address.status}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">
                    {address.streetAddress}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} {address.zipCode}
                  </p>
                  {address.deliveryLog && (
                    <p className="text-xs text-gray-500 mt-1">
                      Completed {formatTime(address.deliveryLog.completedAt)}
                    </p>
                  )}
                  {address.specialInstructions && (
                    <p className="text-xs text-info-700 mt-2 flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{address.specialInstructions}</span>
                    </p>
                  )}
                  {isPending && (
                    <div className="mt-2">
                      <span className="text-sm text-primary-600 font-medium">
                        Tap to start →
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
