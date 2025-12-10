'use client'

import { useState, useEffect } from 'react'
import { Users, MapPin, CheckCircle, Download, Search, FileText, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { DriverProfileModal } from '@/components/admin/DriverProfileModal'
import { AddressProfileModal } from '@/components/admin/AddressProfileModal'

interface ReportStats {
  totalDrivers: number
  totalAddresses: number
  completedRoutes: number
  totalVolunteerHours: number
}

interface Driver {
  id: number
  name: string
  email: string
  phone?: string
  routesCompleted: number
  volunteerHours: number
}

interface Address {
  id: number
  streetAddress: string
  city: string
  state: string
  zipCode: string
  timesDelivered: number
}

interface CompletedRoute {
  id: number
  name: string
  date: string
  driverName: string
  totalStops: number
  completedStops: number
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'people' | 'places' | 'routes'>('people')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [completedRoutes, setCompletedRoutes] = useState<CompletedRoute[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, driversRes, addressesRes, routesRes] = await Promise.all([
        fetch('/api/reports/stats'),
        fetch('/api/reports/drivers'),
        fetch('/api/reports/addresses'),
        fetch('/api/reports/completed-routes'),
      ])

      if (!statsRes.ok || !driversRes.ok || !addressesRes.ok || !routesRes.ok) {
        throw new Error('Failed to fetch report data')
      }

      const [statsData, driversData, addressesData, routesData] = await Promise.all([
        statsRes.json(),
        driversRes.json(),
        addressesRes.json(),
        routesRes.json(),
      ])

      setStats(statsData.data)
      setDrivers(driversData.data || [])
      setAddresses(addressesData.data || [])
      setCompletedRoutes(routesData.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
      console.error('Error fetching reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportAllData = async () => {
    try {
      const response = await fetch('/api/reports/export-all')
      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asg_full_report_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error exporting data:', err)
      alert('Failed to export data to CSV')
    }
  }

  const handleExportDailyReport = async () => {
    // Prompt for date selection
    const dateInput = prompt('Enter date for daily report (YYYY-MM-DD):', new Date().toISOString().split('T')[0])
    if (!dateInput) return

    try {
      const response = await fetch(`/api/reports/daily-report?date=${dateInput}`)
      if (!response.ok) {
        throw new Error('Failed to export daily report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `daily_route_report_${dateInput}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error exporting daily report:', err)
      alert('Failed to export daily report')
    }
  }

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAddresses = addresses.filter(
    (address) =>
      address.streetAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.zipCode.includes(searchQuery)
  )

  const filteredRoutes = completedRoutes.filter(
    (route) =>
      route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.driverName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return <Loading fullScreen text="Loading reports..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Error Loading Reports"
        message={error}
        onDismiss={() => setError(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">View driver statistics, delivery history, and export data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportDailyReport}>
            <Calendar className="w-4 h-4" />
            Daily Report
          </Button>
          <Button variant="primary" onClick={handleExportAllData}>
            <Download className="w-4 h-4" />
            Export All Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalDrivers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-success-100 rounded-lg">
                <MapPin className="w-6 h-6 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Places</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalAddresses || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-info-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-info-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Routes</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.completedRoutes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-warning-100 rounded-lg">
                <FileText className="w-6 h-6 text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Volunteer Hours</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalVolunteerHours || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card padding="sm">
        <div className="flex items-center gap-3 p-2">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search people, places, or routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
          />
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('people')}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'people'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              People ({filteredDrivers.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('places')}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'places'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Places ({filteredAddresses.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'routes'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed Routes ({filteredRoutes.length})
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'people' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrivers.map((driver) => (
              <div key={driver.id} className="cursor-pointer" onClick={() => setSelectedDriver(driver)}>
                <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                        <p className="text-sm text-gray-600">{driver.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Routes Completed:</span>
                      <span className="font-semibold text-gray-900">{driver.routesCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Volunteer Hours:</span>
                      <span className="font-semibold text-gray-900">{driver.volunteerHours}h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'places' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAddresses.map((address) => (
              <div key={address.id} className="cursor-pointer" onClick={() => setSelectedAddress(address)}>
                <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-success-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{address.streetAddress}</h3>
                      <p className="text-sm text-gray-600">
                        {address.city}, {address.state} {address.zipCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Times Delivered:</span>
                      <span className="font-semibold text-gray-900">{address.timesDelivered}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'routes' && (
          <div className="space-y-3">
            {filteredRoutes.map((route) => (
              <Card key={route.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-success-600" />
                        <h3 className="font-semibold text-gray-900">{route.name}</h3>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Driver: {route.driverName}</span>
                        <span>Date: {new Date(route.date).toLocaleDateString()}</span>
                        <span>Stops: {route.completedStops}/{route.totalStops}</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-success-600">
                      {Math.round((route.completedStops / route.totalStops) * 100)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty States */}
        {activeTab === 'people' && filteredDrivers.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No drivers found</p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'places' && filteredAddresses.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No places found</p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'routes' && filteredRoutes.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No completed routes found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Profile Modals */}
      {selectedDriver && (
        <DriverProfileModal
          isOpen={true}
          onClose={() => setSelectedDriver(null)}
          driverId={selectedDriver.id}
        />
      )}

      {selectedAddress && (
        <AddressProfileModal
          isOpen={true}
          onClose={() => setSelectedAddress(null)}
          addressId={selectedAddress.id}
        />
      )}
    </div>
  )
}
