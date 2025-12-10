'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Navigation2, MapPin, MessageSquare } from 'lucide-react'
import PickupForm from '@/components/driver/PickupForm'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface AddressData {
  address: {
    id: number
    streetAddress: string
    city: string
    state: string
    zipCode: string
    latitude?: number
    longitude?: number
    specialInstructions?: string | null
    status: string
  }
}

export default function PickupConfirmation() {
  const router = useRouter()
  const params = useParams()
  const { status } = useSession()
  const [addressData, setAddressData] = useState<AddressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextAddressId, setNextAddressId] = useState<number | null>(null)

  const addressId = params.addressId as string

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchAddressData()
    }
  }, [status, router, addressId])

  const fetchAddressData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch current address data
      const response = await fetch(`/api/delivery/${addressId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch address data')
      }

      const data = await response.json()
      setAddressData(data)

      // Fetch driver's current route to find next address
      const routeResponse = await fetch('/api/driver/route')
      console.log('Route response status:', routeResponse.status)

      if (routeResponse.ok) {
        const routeData = await routeResponse.json()
        console.log('Route data:', routeData)

        if (routeData.route && routeData.route.addresses) {
          const addresses = routeData.route.addresses
          console.log('All addresses:', addresses)

          // Find current address index
          const currentIndex = addresses.findIndex(
            (addr: any) => addr.id === parseInt(addressId)
          )
          console.log('Current address index:', currentIndex, 'addressId:', addressId)

          // Find next pending address
          if (currentIndex !== -1) {
            const remainingAddresses = addresses.slice(currentIndex + 1)
            console.log('Remaining addresses:', remainingAddresses)

            const nextAddress = remainingAddresses.find(
              (addr: any) => addr.status === 'pending'
            )
            console.log('Next pending address:', nextAddress)

            if (nextAddress) {
              setNextAddressId(nextAddress.id)
              console.log('Set nextAddressId to:', nextAddress.id)
            } else {
              console.log('No next pending address found')
            }
          }
        } else {
          console.log('No route or addresses in response')
        }
      } else {
        console.log('Route fetch failed')
      }
    } catch (err) {
      console.error('Error fetching address:', err)
      setError('Failed to load address data')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (data: {
    foodOutside: boolean | null
    notes: string
    gpsLatitude?: number
    gpsLongitude?: number
  }) => {
    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`/api/delivery/${addressId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to log pick-up')
      }

      // Navigate to next address or completion page
      if (nextAddressId) {
        router.push(`/driver/route/${nextAddressId}`)
      } else {
        router.push('/driver/complete')
      }
    } catch (err) {
      console.error('Error logging pick-up:', err)
      setError('Failed to save pick-up. Please try again.')
      setSubmitting(false)
    }
  }


  const handleBack = () => {
    router.push('/driver/dashboard')
  }

  const handleNavigate = () => {
    if (!addressData) return

    const { latitude, longitude, streetAddress, city, state, zipCode } = addressData.address

    // Use GPS coordinates if available (more accurate, especially for geocoded addresses)
    // Otherwise fall back to text address
    let destination: string
    if (latitude && longitude) {
      destination = `${latitude},${longitude}`
    } else {
      const fullAddress = `${streetAddress}, ${city}, ${state} ${zipCode}`
      destination = encodeURIComponent(fullAddress)
    }

    // Open Google Maps with navigation
    // On mobile: Opens Google Maps app if installed, otherwise mobile web
    // On desktop: Opens Google Maps in browser
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`

    window.open(mapsUrl, '_blank')
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading address..." />
  }

  if (error && !addressData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorMessage message={error} />
          <div className="flex gap-3 mt-4">
            <button onClick={handleBack} className="flex-1 btn btn-secondary">
              Go Back
            </button>
            <button
              onClick={fetchAddressData}
              className="flex-1 btn btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!addressData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Address not found
          </h2>
          <p className="text-gray-600 mb-4">
            The address you're looking for could not be found.
          </p>
          <button onClick={handleBack} className="btn btn-primary">
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
            <h1 className="text-xl font-bold text-gray-900">Pick-up Stop</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-4">
        {/* Address Card */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Delivery Address
              </h2>
              <p className="text-gray-700 font-medium">
                {addressData.address.streetAddress}
              </p>
              <p className="text-gray-600">
                {addressData.address.city}, {addressData.address.state}{' '}
                {addressData.address.zipCode}
              </p>
            </div>
          </div>

          {/* Special Instructions */}
          {addressData.address.specialInstructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-900 mb-1">
                    Special Instructions
                  </p>
                  <p className="text-sm text-blue-700">
                    {addressData.address.specialInstructions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigate Button */}
          <button
            onClick={handleNavigate}
            className="w-full btn btn-primary py-4 text-lg flex items-center justify-center gap-3"
          >
            <Navigation2 className="w-6 h-6" />
            Navigate to This Address
          </button>

          <p className="text-xs text-gray-500 text-center mt-2">
            Opens Google Maps • Click anytime to resume navigation
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div>
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Pickup Form */}
        <PickupForm
          address={addressData.address}
          onComplete={handleComplete}
          loading={submitting}
        />
      </main>
    </div>
  )
}
