'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Route as RouteIcon, User, MapPin, CheckCircle, Clock, Pause, Map, Trash2, Download } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Select } from '@/components/shared/Input'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { RouteMapView } from '@/components/admin/RouteMapView'
import type { RouteWithAddresses } from '@/types'

interface RouteListProps {
  refreshTrigger?: number
}

export function RouteList({ refreshTrigger }: RouteListProps) {
  const router = useRouter()
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedRoutes, setSelectedRoutes] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [showMapView, setShowMapView] = useState(false)
  const [selectedRouteForMap, setSelectedRouteForMap] = useState<any>(null)
  const [loadingRouteDetails, setLoadingRouteDetails] = useState(false)

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/routes?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch routes')
      }

      setRoutes(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routes')
      console.error('Error fetching routes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [statusFilter, refreshTrigger])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success-600" />
      case 'active':
        return <Clock className="w-5 h-5 text-primary-600" />
      default:
        return <Pause className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-success-100 text-success-700 border-success-200',
      active: 'bg-primary-100 text-primary-700 border-primary-200',
      pending: 'bg-gray-100 text-gray-700 border-gray-200',
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const handleViewMap = async (e: React.MouseEvent, routeId: number) => {
    e.preventDefault()
    e.stopPropagation()

    // Fetch full route details with addresses
    setLoadingRouteDetails(true)
    try {
      const response = await fetch(`/api/routes/${routeId}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setSelectedRouteForMap(data.data)
        setShowMapView(true)
      } else {
        alert('Failed to load route details')
      }
    } catch (error) {
      console.error('Error loading route details:', error)
      alert('Failed to load route details')
    } finally {
      setLoadingRouteDetails(false)
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRoutes(new Set(routes.map(r => r.id)))
    } else {
      setSelectedRoutes(new Set())
    }
  }

  const handleSelectRoute = (routeId: number) => {
    const newSelected = new Set(selectedRoutes)
    if (newSelected.has(routeId)) {
      newSelected.delete(routeId)
    } else {
      newSelected.add(routeId)
    }
    setSelectedRoutes(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedRoutes.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedRoutes.size} route(s)? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    const routeIds = Array.from(selectedRoutes)
    let successCount = 0
    let failCount = 0

    for (const routeId of routeIds) {
      try {
        const response = await fetch(`/api/routes/${routeId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch (err) {
        failCount++
        console.error(`Error deleting route ${routeId}:`, err)
      }
    }

    setIsDeleting(false)
    setSelectedRoutes(new Set())

    if (failCount > 0) {
      alert(`Deleted ${successCount} route(s). Failed to delete ${failCount} route(s).`)
    } else {
      alert(`Successfully deleted ${successCount} route(s).`)
    }

    fetchRoutes()
  }

  const handleBulkExport = async () => {
    if (selectedRoutes.size === 0) return

    try {
      const routeIds = Array.from(selectedRoutes)
      const csvContents: string[] = []
      let errorCount = 0

      for (const routeId of routeIds) {
        try {
          const response = await fetch(`/api/routes/${routeId}/export`)
          if (response.ok) {
            const text = await response.text()
            if (text && text.trim().length > 0) {
              csvContents.push(text)
              csvContents.push('\n\n---\n\n') // Clear separator between routes
            }
          } else {
            console.error(`Failed to export route ${routeId}:`, response.status)
            errorCount++
          }
        } catch (err) {
          console.error(`Error exporting route ${routeId}:`, err)
          errorCount++
        }
      }

      if (csvContents.length === 0) {
        alert('No routes were exported. Please check that the routes have data.')
        return
      }

      // Create and download the CSV file
      const csvString = csvContents.join('')
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `routes_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      if (errorCount > 0) {
        alert(`Exported ${csvContents.length / 2} route(s). Failed to export ${errorCount} route(s).`)
      } else {
        alert(`Successfully exported ${selectedRoutes.size} route(s) to CSV.`)
      }
    } catch (err) {
      console.error('Error exporting routes:', err)
      alert('Failed to export routes to CSV. Check console for details.')
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="p-12">
          <Loading text="Loading routes..." />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <ErrorMessage
        title="Error Loading Routes"
        message={error}
        onDismiss={() => setError(null)}
      />
    )
  }

  const allSelected = routes.length > 0 && selectedRoutes.size === routes.length
  const someSelected = selectedRoutes.size > 0 && selectedRoutes.size < routes.length

  return (
    <div className="space-y-4">
      {/* Filters and Bulk Actions */}
      <Card padding="sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Select All Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={handleSelectAll}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>

            <Select
              label=""
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Routes' },
                { value: 'pending', label: 'Pending' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
              ]}
              className="w-48"
            />

            {/* Bulk Action Buttons */}
            {selectedRoutes.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkExport}
                  disabled={isDeleting}
                >
                  <Download className="w-4 h-4" />
                  Export ({selectedRoutes.size})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="text-danger-600 hover:bg-danger-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedRoutes.size})
                </Button>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {routes.length} route{routes.length !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>

      {/* Routes List */}
      {routes.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <RouteIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No routes found</h3>
            <p className="text-gray-500">
              {statusFilter !== 'all'
                ? `No ${statusFilter} routes available`
                : 'Upload a CSV file to create routes'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {routes.map((route) => (
            <Card key={route.id} padding="none">
              <div className="flex">
                {/* Checkbox */}
                <div className="flex-shrink-0 w-12 flex items-center justify-center border-r border-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedRoutes.has(route.id)}
                    onChange={() => handleSelectRoute(route.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </div>

                {/* Map Icon Button */}
                <button
                  onClick={(e) => handleViewMap(e, route.id)}
                  className="flex-shrink-0 w-16 flex items-center justify-center bg-primary-50 hover:bg-primary-100 transition-colors border-r border-gray-200"
                  title="View route map"
                >
                  <Map className="w-6 h-6 text-primary-600" />
                </button>

                {/* Route Card Content */}
                <Link href={`/admin/routes/${route.id}`} className="flex-1">
                  <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      {/* Route Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(route.status)}
                          <h3 className="text-lg font-semibold text-gray-900">
                            {route.name}
                          </h3>
                          {getStatusBadge(route.status)}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          {/* Driver */}
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {route.driver ? route.driver.name : 'Unassigned'}
                          </div>

                          {/* Stops */}
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {route.stats.completedStops} of {route.stats.totalStops} stops
                          </div>

                          {/* Date */}
                          <div className="text-gray-500">
                            {new Date(route.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {route.stats.percentComplete}%
                        </div>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success-500 transition-all"
                            style={{ width: `${route.stats.percentComplete}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Route Map View Modal */}
      {selectedRouteForMap && (
        <RouteMapView
          isOpen={showMapView}
          onClose={() => {
            setShowMapView(false)
            setSelectedRouteForMap(null)
          }}
          route={selectedRouteForMap}
          onReorder={async (addressIds: number[]) => {
            try {
              const response = await fetch(`/api/routes/${selectedRouteForMap.id}/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addressIds }),
              })

              if (!response.ok) {
                throw new Error('Failed to reorder addresses')
              }

              const data = await response.json()
              setSelectedRouteForMap({ ...selectedRouteForMap, addresses: data.route.addresses })

              // Refresh the routes list
              fetchRoutes()
            } catch (err) {
              console.error('Error reordering addresses:', err)
              throw err
            }
          }}
        />
      )}
    </div>
  )
}
