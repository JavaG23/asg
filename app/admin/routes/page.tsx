'use client'

import { useState, useEffect } from 'react'
import { RouteList } from '@/components/admin/RouteList'
import { CSVUpload } from '@/components/admin/CSVUpload'
import { Button } from '@/components/shared/Button'
import { FileUp, Map } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { RoutesOverviewMap } from '@/components/admin/RoutesOverviewMap'

interface RouteData {
  id: number
  name: string
  status: string
  driverId: number | null
  driver?: { id: number; name: string } | null
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

export default function RoutesPage() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showOverviewMap, setShowOverviewMap] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [drivers, setDrivers] = useState<DriverData[]>([])
  const [loadingMapData, setLoadingMapData] = useState(false)

  const handleUploadComplete = () => {
    setShowUploadModal(false)
    setRefreshTrigger((prev) => prev + 1)
  }

  const fetchMapData = async () => {
    setLoadingMapData(true)
    try {
      // Fetch routes with addresses
      const routesRes = await fetch('/api/routes')
      const routesData = await routesRes.json()
      if (routesData.data) {
        setRoutes(routesData.data)
      }

      // Fetch drivers with home addresses
      const driversRes = await fetch('/api/drivers?includeAll=true')
      const driversData = await driversRes.json()
      if (driversData.data) {
        setDrivers(driversData.data)
      }
    } catch (error) {
      console.error('Error fetching map data:', error)
    } finally {
      setLoadingMapData(false)
    }
  }

  const handleOpenOverviewMap = async () => {
    await fetchMapData()
    setShowOverviewMap(true)
  }

  const handleAssignDriver = async (routeId: number, driverId: number | null) => {
    const response = await fetch(`/api/routes/${routeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    })

    if (!response.ok) {
      throw new Error('Failed to assign driver')
    }

    // Refresh data
    await fetchMapData()
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routes</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all pickup routes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleOpenOverviewMap}
            disabled={loadingMapData}
          >
            <Map className="w-5 h-5" />
            {loadingMapData ? 'Loading...' : 'Overview Map'}
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowUploadModal(true)}
          >
            <FileUp className="w-5 h-5" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Routes List */}
      <RouteList refreshTrigger={refreshTrigger} />

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Import Routes"
        size="lg"
      >
        <CSVUpload onUploadComplete={handleUploadComplete} />
      </Modal>

      {/* Routes Overview Map */}
      <RoutesOverviewMap
        isOpen={showOverviewMap}
        onClose={() => setShowOverviewMap(false)}
        routes={routes}
        drivers={drivers}
        onAssignDriver={handleAssignDriver}
      />
    </div>
  )
}
