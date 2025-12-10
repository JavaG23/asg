'use client'

import { useState, useEffect } from 'react'
import { GoogleMap, MapMarker } from '@/components/maps/GoogleMap'
import { Navigation2, MapPin, AlertCircle } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'

interface NavigationMapProps {
  currentAddress: {
    id: number
    streetAddress: string
    city: string
    state: string
    zipCode: string
    latitude?: number
    longitude?: number
  }
}

export function NavigationMap({ currentAddress }: NavigationMapProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Get user's current location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationError(null)
      },
      (error) => {
        console.error('Error getting location:', error)
        let errorMessage = 'Unable to get your location'

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your device settings.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
        }

        setLocationError(errorMessage)

        // Fallback: use destination as center if we have coordinates
        if (currentAddress.latitude && currentAddress.longitude) {
          setUserLocation({
            lat: currentAddress.latitude,
            lng: currentAddress.longitude,
          })
        }
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [currentAddress])

  // Fetch directions using Google Maps DirectionsService (client-side)
  useEffect(() => {
    console.log('NavigationMap - Fetch directions effect triggered')
    console.log('NavigationMap - User location:', userLocation)
    console.log('NavigationMap - Destination:', currentAddress.latitude, currentAddress.longitude)

    if (!userLocation || !currentAddress.latitude || !currentAddress.longitude) {
      console.log('NavigationMap - Missing location data, skipping directions fetch')
      setLoading(false)
      return
    }

    const fetchDirections = async () => {
      try {
        setError(null)

        // Wait for Google Maps to be loaded
        if (typeof google === 'undefined' || !google.maps) {
          console.log('NavigationMap - Google Maps not loaded yet, retrying...')
          setTimeout(fetchDirections, 500)
          return
        }

        console.log('NavigationMap - Using DirectionsService to fetch route')
        const directionsService = new google.maps.DirectionsService()

        if (!currentAddress.latitude || !currentAddress.longitude) {
          setError('Address coordinates not available')
          setLoading(false)
          return
        }

        const request: google.maps.DirectionsRequest = {
          origin: new google.maps.LatLng(userLocation.lat, userLocation.lng),
          destination: new google.maps.LatLng(currentAddress.latitude, currentAddress.longitude),
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.IMPERIAL,
        }

        directionsService.route(request, (result, status) => {
          console.log('NavigationMap - DirectionsService response status:', status)

          if (status === google.maps.DirectionsStatus.OK && result) {
            console.log('NavigationMap - Setting directions with', result.routes.length, 'routes')
            setDirections(result)
          } else {
            console.log('NavigationMap - Directions request failed:', status)
            setError('No route found to destination')
          }
          setLoading(false)
        })
      } catch (err) {
        console.error('Error fetching directions:', err)
        setError('Unable to load directions. Please check your internet connection.')
        setLoading(false)
      }
    }

    fetchDirections()
  }, [userLocation, currentAddress])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Loading text="Loading navigation..." />
      </div>
    )
  }

  // If no coordinates, show error
  if (!currentAddress.latitude || !currentAddress.longitude) {
    return (
      <div className="h-full flex items-center justify-center bg-yellow-50 p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Address Not Geocoded
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            This address doesn't have GPS coordinates yet. Please contact your administrator to geocode the addresses.
          </p>
          <div className="bg-white p-3 rounded-lg border border-gray-200 text-left">
            <p className="text-sm font-medium text-gray-900">
              {currentAddress.streetAddress}
            </p>
            <p className="text-sm text-gray-600">
              {currentAddress.city}, {currentAddress.state} {currentAddress.zipCode}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const mapCenter = userLocation || {
    lat: currentAddress.latitude,
    lng: currentAddress.longitude,
  }

  const markers: MapMarker[] = [
    ...(userLocation ? [{
      id: 0,
      lat: userLocation.lat,
      lng: userLocation.lng,
      label: 'You',
      draggable: false,
    }] : []),
    {
      id: currentAddress.id,
      lat: currentAddress.latitude,
      lng: currentAddress.longitude,
      label: 'Destination',
      draggable: false,
    },
  ]

  const route = directions?.routes[0]
  const leg = route?.legs[0]

  return (
    <div className="h-full flex flex-col">
      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMap
          center={mapCenter}
          zoom={15}
          markers={markers}
          showRoute={false}
          directionsData={directions}
        />

        {/* Location Error Banner */}
        {locationError && (
          <div className="absolute top-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Location Access Issue</p>
                <p className="text-xs text-yellow-700 mt-1">{locationError}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Info Panel */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        {/* Destination Address */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{currentAddress.streetAddress}</p>
              <p className="text-sm text-gray-600">
                {currentAddress.city}, {currentAddress.state} {currentAddress.zipCode}
              </p>
            </div>
          </div>
        </div>

        {/* Directions Info */}
        {error ? (
          <div className="p-4 bg-red-50 border-t border-red-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          </div>
        ) : leg ? (
          <div className="p-4">
            {/* Distance and Duration */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Navigation2 className="w-5 h-5 text-primary-600" />
                <span className="font-semibold text-gray-900">{leg.duration?.text || 'N/A'}</span>
              </div>
              <span className="text-gray-600 font-medium">{leg.distance?.text || 'N/A'}</span>
            </div>

            {/* Next Turn */}
            {leg.steps && leg.steps.length > 0 && leg.steps[0].instructions && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Next Turn</p>
                <div className="p-3 bg-primary-50 rounded-lg border border-primary-100">
                  <p className="text-sm font-medium text-primary-900">
                    {leg.steps[0].instructions.replace(/<[^>]*>/g, '')}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-primary-700">
                    <span>{leg.steps[0].distance?.text || 'N/A'}</span>
                    <span>•</span>
                    <span>{leg.steps[0].duration?.text || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : userLocation ? (
          <div className="p-4">
            <Loading text="Loading directions..." />
          </div>
        ) : (
          <div className="p-4 bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              Enable location access to get turn-by-turn directions
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
