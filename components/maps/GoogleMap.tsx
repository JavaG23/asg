'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

export interface MapMarker {
  id: number
  lat: number
  lng: number
  label: string
  title?: string // Optional custom tooltip text
  draggable?: boolean
}

interface GoogleMapProps {
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarker[]
  onMarkerDragEnd?: (markerId: number, lat: number, lng: number) => void
  onMarkerClick?: (markerId: number) => void
  selectedMarkerId?: number | null
  showRoute?: boolean
  directionsData?: any // Google Directions API response
  className?: string
}

export function GoogleMap({
  center,
  zoom = 12,
  markers = [],
  onMarkerDragEnd,
  onMarkerClick,
  selectedMarkerId = null,
  showRoute = false,
  directionsData,
  className = 'w-full h-full min-h-[400px]',
}: GoogleMapProps) {
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map())
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null)
  const [mapReady, setMapReady] = useState(false)

  // Callback ref
  const mapRefCallback = (element: HTMLDivElement | null) => {
    console.log('GoogleMap - Ref callback called with element:', !!element)
    setMapContainer(element)
  }

  // Initialize map when container is ready
  useEffect(() => {
    console.log('GoogleMap - Init effect triggered. Container:', !!mapContainer, 'Instance:', !!mapInstanceRef.current)
    if (!mapContainer || mapInstanceRef.current) return

    const initMap = async () => {
      try {
        console.log('GoogleMap - Initializing map...')
        console.log('GoogleMap - Container:', !!mapContainer)

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

        if (!apiKey) {
          console.error('GoogleMap - API key missing!')
          setError('Google Maps API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.')
          setIsLoading(false)
          return
        }

        console.log('GoogleMap - Loading Google Maps library...')
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['marker', 'places'],
        })

        await loader.load()
        console.log('GoogleMap - Library loaded successfully')

        console.log('GoogleMap - Creating map instance...')
        const map = new google.maps.Map(mapContainer, {
          center,
          zoom,
          mapId: 'ASG_ROUTE_MAP',
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        })

        mapInstanceRef.current = map
        console.log('GoogleMap - Map instance created successfully')
        setIsLoading(false)
        setMapReady(true) // Signal that map is ready for markers
      } catch (err) {
        console.error('GoogleMap - Error loading Google Maps:', err)
        setError('Failed to load Google Maps. Please check your API key and internet connection.')
        setIsLoading(false)
      }
    }

    initMap()
  }, [mapContainer, center, zoom])

  // Update center and zoom when they change
  useEffect(() => {
    if (mapInstanceRef.current) {
      console.log('GoogleMap - Updating center and zoom')
      mapInstanceRef.current.setCenter(center)
      mapInstanceRef.current.setZoom(zoom)
    }
  }, [center, zoom])

  // Update markers when they change
  useEffect(() => {
    console.log('GoogleMap - Markers effect triggered')
    console.log('GoogleMap - Map ready:', mapReady)
    console.log('GoogleMap - Map instance exists:', !!mapInstanceRef.current)
    console.log('GoogleMap - Markers count:', markers.length)

    if (!mapReady || !mapInstanceRef.current) {
      console.log('GoogleMap - Map not ready, skipping markers')
      return
    }

    console.log('GoogleMap - Updating markers on map')

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current.clear()

    // Add new markers
    markers.forEach((marker, index) => {
      const isSelected = selectedMarkerId === marker.id

      const mapMarker = new google.maps.Marker({
        map: mapInstanceRef.current,
        position: { lat: marker.lat, lng: marker.lng },
        title: marker.title || marker.label, // Use custom title if provided, otherwise use label
        label: {
          text: (index + 1).toString(),
          color: 'white',
          fontWeight: 'bold',
        },
        draggable: marker.draggable || false,
        animation: isSelected ? google.maps.Animation.BOUNCE : google.maps.Animation.DROP,
        icon: isSelected ? {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#1d4ed8', // primary-700
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        } : undefined,
      })

      // Add click listener
      if (onMarkerClick) {
        mapMarker.addListener('click', () => {
          onMarkerClick(marker.id)
        })
      }

      // Add drag end listener
      if (marker.draggable && onMarkerDragEnd) {
        mapMarker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            onMarkerDragEnd(marker.id, event.latLng.lat(), event.latLng.lng())
          }
        })
      }

      markersRef.current.set(marker.id, mapMarker)
    })

    // Update route polyline (simple line for admin view)
    // Only show simple polyline if we don't have directions data
    if (showRoute && markers.length > 1 && !directionsData) {
      const routePath = markers.map((m) => ({ lat: m.lat, lng: m.lng }))

      if (polylineRef.current) {
        polylineRef.current.setPath(routePath)
      } else {
        polylineRef.current = new google.maps.Polyline({
          path: routePath,
          geodesic: true,
          strokeColor: '#2563eb', // primary-600
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: mapInstanceRef.current,
        })
      }
    } else if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    // Fit bounds to show all markers
    if (markers.length > 0 && mapInstanceRef.current) {
      const bounds = new google.maps.LatLngBounds()
      markers.forEach((marker) => {
        bounds.extend({ lat: marker.lat, lng: marker.lng })
      })
      mapInstanceRef.current.fitBounds(bounds)

      // Don't zoom in too much for single marker
      if (markers.length === 1) {
        const listener = google.maps.event.addListener(
          mapInstanceRef.current,
          'idle',
          () => {
            if (mapInstanceRef.current && mapInstanceRef.current.getZoom()! > 15) {
              mapInstanceRef.current.setZoom(15)
            }
            google.maps.event.removeListener(listener)
          }
        )
      }
    }
  }, [mapReady, markers, onMarkerDragEnd, onMarkerClick, selectedMarkerId, showRoute, directionsData])

  // Render Google Directions route (for driver navigation with turn-by-turn)
  useEffect(() => {
    console.log('GoogleMap - DirectionsRenderer effect triggered')
    console.log('GoogleMap - Map ready:', mapReady)
    console.log('GoogleMap - Map instance exists:', !!mapInstanceRef.current)
    console.log('GoogleMap - Directions data:', directionsData)

    if (!mapReady || !mapInstanceRef.current) {
      console.log('GoogleMap - Map instance not ready, skipping directions')
      return
    }

    if (directionsData && directionsData.routes && directionsData.routes.length > 0) {
      console.log('GoogleMap - Setting up DirectionsRenderer with routes:', directionsData.routes.length)

      // Create DirectionsRenderer if it doesn't exist
      if (!directionsRendererRef.current) {
        console.log('GoogleMap - Creating new DirectionsRenderer')
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map: mapInstanceRef.current,
          suppressMarkers: true, // We're using custom markers
          polylineOptions: {
            strokeColor: '#2563eb', // primary-600
            strokeOpacity: 0.8,
            strokeWeight: 4,
          },
        })
      }

      // Set the directions
      console.log('GoogleMap - Setting directions on renderer')
      directionsRendererRef.current.setDirections(directionsData)
      console.log('GoogleMap - Directions set successfully')
    } else {
      console.log('GoogleMap - No directions data or empty routes')
      if (directionsRendererRef.current) {
        console.log('GoogleMap - Clearing existing DirectionsRenderer')
        directionsRendererRef.current.setMap(null)
        directionsRendererRef.current = null
      }
    }
  }, [mapReady, directionsData])

  return (
    <div className={`relative ${className}`}>
      {/* Map Container - Always render so ref is attached */}
      <div ref={mapRefCallback} className="w-full h-full" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg border-2 border-red-200">
          <div className="text-center p-6 max-w-md">
            <div className="text-red-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-red-900 font-medium mb-2">Google Maps Error</p>
            <p className="text-xs text-red-700">{error}</p>
            <p className="text-xs text-gray-600 mt-3">
              See <code className="bg-red-100 px-1 py-0.5 rounded">GOOGLE_MAPS_INTEGRATION_GUIDE.md</code> for setup instructions.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
