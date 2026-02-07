'use client'

import { useState, useMemo, useEffect } from 'react'
import { GoogleMap, MapMarker } from '@/components/maps/GoogleMap'
import { Modal } from '@/components/shared/Modal'
import { Button } from '@/components/shared/Button'
import { Select } from '@/components/shared/Input'
import {
  X,
  MapPin,
  Home,
  Truck,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

interface RouteData {
  id: number
  name: string
  status: string
  driverId: number | null
  driver?: {
    id: number
    name: string
  } | null
  addresses: Array<{
    id: number
    latitude?: number | null
    longitude?: number | null
    streetAddress: string
    city: string
  }>
}

interface DriverData {
  id: number
  name: string
  email: string
  homeLatitude?: number | null
  homeLongitude?: number | null
  homeStreet?: string | null
  homeCity?: string | null
}

interface RoutesOverviewMapProps {
  isOpen: boolean
  onClose: () => void
  routes: RouteData[]
  drivers: DriverData[]
  onAssignDriver?: (routeId: number, driverId: number | null) => Promise<void>
}

// Route colors for differentiation
const ROUTE_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#c026d3', // fuchsia
  '#65a30d', // lime
]

export function RoutesOverviewMap({
  isOpen,
  onClose,
  routes,
  drivers,
  onAssignDriver,
}: RoutesOverviewMapProps) {
  const [selectedRoutes, setSelectedRoutes] = useState<Set<number>>(new Set())
  const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set())
  const [expandedPanel, setExpandedPanel] = useState<'routes' | 'drivers' | null>('routes')
  const [assigningRoute, setAssigningRoute] = useState<number | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)

  // Initialize with all routes selected
  useEffect(() => {
    if (routes.length > 0 && selectedRoutes.size === 0) {
      setSelectedRoutes(new Set(routes.map((r) => r.id)))
    }
  }, [routes])

  // Initialize with drivers who have home addresses selected
  useEffect(() => {
    if (drivers.length > 0 && selectedDrivers.size === 0) {
      const driversWithAddresses = drivers.filter(
        (d) => d.homeLatitude && d.homeLongitude
      )
      setSelectedDrivers(new Set(driversWithAddresses.map((d) => d.id)))
    }
  }, [drivers])

  // Get color for a route
  const getRouteColor = (routeId: number) => {
    const index = routes.findIndex((r) => r.id === routeId)
    return ROUTE_COLORS[index % ROUTE_COLORS.length]
  }

  // Create markers for selected routes
  const routeMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = []

    routes
      .filter((route) => selectedRoutes.has(route.id))
      .forEach((route) => {
        const routeColor = getRouteColor(route.id)
        route.addresses
          .filter((addr) => addr.latitude && addr.longitude)
          .forEach((addr, index) => {
            markers.push({
              id: addr.id,
              lat: addr.latitude!,
              lng: addr.longitude!,
              label: `${route.name} - Stop ${index + 1}`,
              title: `${route.name}: ${addr.streetAddress}`,
              color: routeColor,
              displayNumber: index + 1, // Per-route numbering (1, 2, 3... for each route)
            })
          })
      })

    return markers
  }, [routes, selectedRoutes])

  // Create markers for driver home addresses
  const driverMarkers: MapMarker[] = useMemo(() => {
    return drivers
      .filter((d) => selectedDrivers.has(d.id) && d.homeLatitude && d.homeLongitude)
      .map((driver) => ({
        id: driver.id + 100000, // Offset to avoid ID collision
        lat: driver.homeLatitude!,
        lng: driver.homeLongitude!,
        label: 'H',
        title: `${driver.name}'s Home`,
        color: '#16a34a', // Green for home addresses
        displayLabel: 'H', // Display "H" for homes
      }))
  }, [drivers, selectedDrivers])

  // Combine all markers
  const allMarkers = useMemo(
    () => [...routeMarkers, ...driverMarkers],
    [routeMarkers, driverMarkers]
  )

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (allMarkers.length > 0) {
      return {
        lat: allMarkers.reduce((sum, m) => sum + m.lat, 0) / allMarkers.length,
        lng: allMarkers.reduce((sum, m) => sum + m.lng, 0) / allMarkers.length,
      }
    }
    return { lat: 38.9072, lng: -77.0369 } // Default: Washington, DC
  }, [allMarkers])

  // Toggle route selection
  const toggleRoute = (routeId: number) => {
    setSelectedRoutes((prev) => {
      const next = new Set(prev)
      if (next.has(routeId)) {
        next.delete(routeId)
      } else {
        next.add(routeId)
      }
      return next
    })
  }

  // Toggle driver selection
  const toggleDriver = (driverId: number) => {
    setSelectedDrivers((prev) => {
      const next = new Set(prev)
      if (next.has(driverId)) {
        next.delete(driverId)
      } else {
        next.add(driverId)
      }
      return next
    })
  }

  // Select/deselect all routes
  const toggleAllRoutes = () => {
    if (selectedRoutes.size === routes.length) {
      setSelectedRoutes(new Set())
    } else {
      setSelectedRoutes(new Set(routes.map((r) => r.id)))
    }
  }

  // Select/deselect all drivers
  const toggleAllDrivers = () => {
    const driversWithAddresses = drivers.filter(
      (d) => d.homeLatitude && d.homeLongitude
    )
    if (selectedDrivers.size === driversWithAddresses.length) {
      setSelectedDrivers(new Set())
    } else {
      setSelectedDrivers(new Set(driversWithAddresses.map((d) => d.id)))
    }
  }

  // Handle driver assignment
  const handleAssignDriver = async (routeId: number, driverId: number | null) => {
    if (!onAssignDriver) return

    setAssignmentLoading(true)
    try {
      await onAssignDriver(routeId, driverId)
      setAssigningRoute(null)
    } catch (error) {
      console.error('Error assigning driver:', error)
    } finally {
      setAssignmentLoading(false)
    }
  }

  // Available drivers for assignment (not assigned to other routes)
  const availableDrivers = useMemo(() => {
    const assignedDriverIds = new Set(
      routes.filter((r) => r.driverId).map((r) => r.driverId)
    )
    return drivers.filter(
      (d) => !assignedDriverIds.has(d.id) || routes.find((r) => r.id === assigningRoute)?.driverId === d.id
    )
  }, [drivers, routes, assigningRoute])

  const driversWithAddresses = drivers.filter((d) => d.homeLatitude && d.homeLongitude)
  const driversWithoutAddresses = drivers.filter((d) => !d.homeLatitude || !d.homeLongitude)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Routes Overview Map" size="xl">
      <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] gap-4">
        {/* Left Panel - Routes and Drivers */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Routes Section */}
          <div className="bg-gray-50 rounded-lg border border-gray-200">
            <button
              onClick={() => setExpandedPanel(expandedPanel === 'routes' ? null : 'routes')}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-gray-900">Routes</span>
                <span className="text-xs text-gray-500">
                  ({selectedRoutes.size}/{routes.length})
                </span>
              </div>
              {expandedPanel === 'routes' ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedPanel === 'routes' && (
              <div className="p-3 pt-0 space-y-2">
                <button
                  onClick={toggleAllRoutes}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  {selectedRoutes.size === routes.length ? 'Deselect All' : 'Select All'}
                </button>

                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {routes.map((route) => (
                    <div
                      key={route.id}
                      className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoutes.has(route.id)}
                        onChange={() => toggleRoute(route.id)}
                        className="rounded text-primary-600"
                      />
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getRouteColor(route.id) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {route.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {route.addresses.length} stops
                          {route.driver ? ` - ${route.driver.name}` : ' - No driver'}
                        </p>
                      </div>
                      {assigningRoute === route.id ? (
                        <Select
                          label=""
                          value={route.driverId?.toString() || ''}
                          onChange={(e) =>
                            handleAssignDriver(
                              route.id,
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          options={[
                            { value: '', label: 'No driver' },
                            ...availableDrivers.map((d) => ({
                              value: d.id.toString(),
                              label: d.name,
                            })),
                          ]}
                          className="w-32"
                          disabled={assignmentLoading}
                        />
                      ) : (
                        onAssignDriver && (
                          <button
                            onClick={() => setAssigningRoute(route.id)}
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            {route.driver ? 'Change' : 'Assign'}
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drivers Section */}
          <div className="bg-gray-50 rounded-lg border border-gray-200">
            <button
              onClick={() => setExpandedPanel(expandedPanel === 'drivers' ? null : 'drivers')}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-success-600" />
                <span className="font-medium text-gray-900">Driver Homes</span>
                <span className="text-xs text-gray-500">
                  ({selectedDrivers.size}/{driversWithAddresses.length})
                </span>
              </div>
              {expandedPanel === 'drivers' ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedPanel === 'drivers' && (
              <div className="p-3 pt-0 space-y-2">
                <button
                  onClick={toggleAllDrivers}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  {selectedDrivers.size === driversWithAddresses.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>

                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {driversWithAddresses.map((driver) => {
                    const assignedRoute = routes.find((r) => r.driverId === driver.id)
                    return (
                      <div
                        key={driver.id}
                        className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDrivers.has(driver.id)}
                          onChange={() => toggleDriver(driver.id)}
                          className="rounded text-success-600"
                        />
                        <Home className="w-4 h-4 text-success-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {driver.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {driver.homeStreet}, {driver.homeCity}
                          </p>
                        </div>
                        {assignedRoute && (
                          <span
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: `${getRouteColor(assignedRoute.id)}20`,
                              color: getRouteColor(assignedRoute.id),
                            }}
                          >
                            {assignedRoute.name}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {driversWithoutAddresses.length > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">
                        No home address ({driversWithoutAddresses.length}):
                      </p>
                      {driversWithoutAddresses.slice(0, 3).map((driver) => (
                        <p key={driver.id} className="text-xs text-gray-400 truncate">
                          {driver.name}
                        </p>
                      ))}
                      {driversWithoutAddresses.length > 3 && (
                        <p className="text-xs text-gray-400">
                          +{driversWithoutAddresses.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Legend</p>
            <div className="space-y-1">
              {routes.filter((r) => selectedRoutes.has(r.id)).map((route) => (
                <div key={route.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <div
                    className="w-3 h-3 rounded-full flex items-center justify-center text-white text-[8px]"
                    style={{ backgroundColor: getRouteColor(route.id) }}
                  >
                    1
                  </div>
                  <span className="truncate">{route.name}</span>
                </div>
              ))}
              {selectedRoutes.size === 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <span>No routes selected</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-600 pt-1 border-t border-gray-100 mt-1">
                <div className="w-3 h-3 rounded-full bg-success-600 flex items-center justify-center text-white text-[8px]">
                  H
                </div>
                <span>Driver home</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 min-h-[400px] rounded-lg overflow-hidden border border-gray-200">
          {allMarkers.length > 0 ? (
            <GoogleMap
              center={mapCenter}
              zoom={11}
              markers={allMarkers}
              showRoute={false}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="text-center p-6 max-w-md">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Locations to Display
                </h3>
                <p className="text-sm text-gray-600">
                  Select routes or drivers with addresses to see them on the map.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Showing {routeMarkers.length} stops from {selectedRoutes.size} routes and{' '}
          {driverMarkers.length} driver homes
        </p>
        <Button variant="secondary" onClick={onClose}>
          <X className="w-4 h-4" />
          Close
        </Button>
      </div>
    </Modal>
  )
}
