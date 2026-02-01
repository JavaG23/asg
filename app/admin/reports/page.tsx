'use client'

import { useState, useEffect, useMemo } from 'react'
import { Users, MapPin, CheckCircle, Download, Search, FileText, Calendar, Clock, TrendingUp, BarChart3 } from 'lucide-react'
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
  totalWeight?: number
  startedAt?: string
  weighedAt?: string
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'events' | 'people' | 'places' | 'routes'>('events')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [completedRoutes, setCompletedRoutes] = useState<CompletedRoute[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [selectedEventDates, setSelectedEventDates] = useState<Set<string>>(new Set())
  const [showingReport, setShowingReport] = useState(false)

  // Hardcoded upcoming ASG Event Dates (scheduled events)
  const scheduledEventDates = [
    { date: '2026-02-07', label: 'February 7, 2026' },
    { date: '2026-04-18', label: 'April 18, 2026' },
    { date: '2026-06-06', label: 'June 6, 2026' },
    { date: '2026-10-03', label: 'October 3, 2026' },
    { date: '2027-08-08', label: 'August 8, 2027' },
  ]

  // Compute all event dates: scheduled dates + any dates with completed routes
  const eventDates = useMemo(() => {
    const dateSet = new Set<string>()

    // Add scheduled event dates
    scheduledEventDates.forEach(e => dateSet.add(e.date))

    // Add dates from completed routes
    completedRoutes.forEach(route => {
      const routeDate = new Date(route.date).toISOString().split('T')[0]
      dateSet.add(routeDate)
    })

    // Convert to array with labels and sort by date
    const allDates = Array.from(dateSet).map(date => {
      const scheduled = scheduledEventDates.find(e => e.date === date)
      if (scheduled) return scheduled

      // Format label for non-scheduled dates
      const d = new Date(date + 'T12:00:00')
      const label = d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      return { date, label }
    })

    // Sort by date descending (most recent first)
    return allDates.sort((a, b) => b.date.localeCompare(a.date))
  }, [completedRoutes])

  // Compute event day stats from completed routes
  const getEventStats = (eventDate: string) => {
    const eventRoutes = completedRoutes.filter(route => {
      const routeDate = new Date(route.date).toISOString().split('T')[0]
      return routeDate === eventDate
    })

    const totalStops = eventRoutes.reduce((sum, r) => sum + r.totalStops, 0)
    const completedStops = eventRoutes.reduce((sum, r) => sum + r.completedStops, 0)
    const uniqueDrivers = new Set(eventRoutes.map(r => r.driverName)).size

    return {
      routeCount: eventRoutes.length,
      driverCount: uniqueDrivers,
      totalStops,
      completedStops,
      completionRate: totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0,
      routes: eventRoutes,
    }
  }

  const getEventStatus = (eventDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const event = new Date(eventDate + 'T12:00:00')
    event.setHours(0, 0, 0, 0)

    if (event < today) return 'past'
    if (event.getTime() === today.getTime()) return 'today'
    return 'upcoming'
  }

  const toggleEventSelection = (date: string) => {
    setSelectedEventDates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }

  const selectAllEvents = () => {
    setSelectedEventDates(new Set(eventDates.map(e => e.date)))
  }

  const deselectAllEvents = () => {
    setSelectedEventDates(new Set())
  }

  // Compute aggregated stats for selected event dates
  const getAggregatedStats = () => {
    const selectedDates = Array.from(selectedEventDates)
    const matchingRoutes = completedRoutes.filter(route => {
      const routeDate = new Date(route.date).toISOString().split('T')[0]
      return selectedDates.includes(routeDate)
    })

    const totalStops = matchingRoutes.reduce((sum, r) => sum + r.totalStops, 0)
    const completedStops = matchingRoutes.reduce((sum, r) => sum + r.completedStops, 0)
    const uniqueDrivers = new Set(matchingRoutes.map(r => r.driverName))

    // Calculate total weight
    const totalWeight = matchingRoutes.reduce((sum, r) => sum + (r.totalWeight || 0), 0)

    // Calculate total time (sum of route durations in minutes)
    let totalTimeMinutes = 0
    matchingRoutes.forEach(route => {
      if (route.startedAt && route.weighedAt) {
        const start = new Date(route.startedAt).getTime()
        const end = new Date(route.weighedAt).getTime()
        totalTimeMinutes += (end - start) / (1000 * 60)
      }
    })

    return {
      routeCount: matchingRoutes.length,
      driverCount: uniqueDrivers.size,
      driverNames: Array.from(uniqueDrivers),
      totalStops,
      completedStops,
      completionRate: totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0,
      totalWeight,
      totalTimeMinutes,
      routes: matchingRoutes,
      selectedDates: selectedDates.sort(),
    }
  }

  // Format user ID as "USR-00042"
  const formatUserId = (id: number) => `USR-${id.toString().padStart(5, '0')}`

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
          <p className="text-gray-600 mt-1">View driver statistics, pickup history, and export data</p>
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
            onClick={() => setActiveTab('events')}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'events'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Event Days ({eventDates.length}){showingReport && ' - Report'}
            </div>
          </button>
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
        {activeTab === 'events' && !showingReport && (
          <div className="space-y-4">
            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectedEventDates.size === eventDates.length ? deselectAllEvents : selectAllEvents}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {selectedEventDates.size === eventDates.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedEventDates.size > 0 && (
                  <span className="text-sm text-gray-500">
                    ({selectedEventDates.size} selected)
                  </span>
                )}
              </div>
              {selectedEventDates.size > 0 && (
                <Button variant="primary" onClick={() => setShowingReport(true)}>
                  <BarChart3 className="w-4 h-4" />
                  Run Report ({selectedEventDates.size} {selectedEventDates.size === 1 ? 'day' : 'days'})
                </Button>
              )}
            </div>

            {/* Event Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventDates.map((event) => {
                const eventStats = getEventStats(event.date)
                const status = getEventStatus(event.date)
                const isSelected = selectedEventDates.has(event.date)
                return (
                  <div
                    key={event.date}
                    className={`cursor-pointer rounded-lg transition-all ${
                      isSelected ? 'ring-2 ring-primary-500' : ''
                    }`}
                    onClick={() => toggleEventSelection(event.date)}
                  >
                    <Card className={`hover:shadow-lg transition-shadow ${
                      isSelected ? 'bg-primary-50/50' : ''
                    }`}>
                      <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-primary-600 border-primary-600'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className={`p-3 rounded-lg ${
                            status === 'past' ? 'bg-gray-100' :
                            status === 'today' ? 'bg-success-100' :
                            'bg-primary-100'
                          }`}>
                            <Calendar className={`w-6 h-6 ${
                              status === 'past' ? 'text-gray-500' :
                              status === 'today' ? 'text-success-600' :
                              'text-primary-600'
                            }`} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${
                              status === 'past' ? 'text-gray-500' : 'text-gray-900'
                            }`}>
                              {event.label}
                            </h3>
                            <div className="flex items-center gap-1 mt-1">
                              {status === 'past' ? (
                                eventStats.routeCount > 0 ? (
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Completed
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Past
                                  </span>
                                )
                              ) : status === 'today' ? (
                                <span className="text-xs text-success-600 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Today
                                </span>
                              ) : (
                                <span className="text-xs text-primary-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Upcoming
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-600 text-xs">Routes</p>
                          <p className="text-xl font-bold text-gray-900">{eventStats.routeCount}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-600 text-xs">Drivers</p>
                          <p className="text-xl font-bold text-gray-900">{eventStats.driverCount}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-600 text-xs">Total Stops</p>
                          <p className="text-xl font-bold text-gray-900">{eventStats.totalStops}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-600 text-xs">Completion</p>
                          <p className={`text-xl font-bold ${
                            eventStats.completionRate === 100 ? 'text-success-600' :
                            eventStats.completionRate > 0 ? 'text-primary-600' :
                            'text-gray-400'
                          }`}>
                            {eventStats.completionRate}%
                          </p>
                        </div>
                      </div>

                      {status === 'past' && eventStats.routeCount > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Stops Completed</span>
                            <span className="font-semibold text-gray-900">
                              {eventStats.completedStops} / {eventStats.totalStops}
                            </span>
                          </div>
                        </div>
                      )}
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>

            {/* Empty State */}
            {eventDates.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No event days found</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Aggregated Report View */}
        {activeTab === 'events' && showingReport && (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Event Report
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {selectedEventDates.size === 1
                    ? `Report for ${eventDates.find(e => selectedEventDates.has(e.date))?.label}`
                    : `Combined report for ${selectedEventDates.size} event days`
                  }
                </p>
              </div>
              <Button variant="secondary" onClick={() => setShowingReport(false)}>
                Back to Event Days
              </Button>
            </div>

            {/* Selected Dates */}
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedEventDates).sort().map(date => {
                const event = eventDates.find(e => e.date === date)
                return (
                  <span
                    key={date}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    <Calendar className="w-3 h-3" />
                    {event?.label || date}
                  </span>
                )
              })}
            </div>

            {/* Aggregated Stats */}
            {(() => {
              const aggStats = getAggregatedStats()
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-primary-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Routes</p>
                            <p className="text-2xl font-bold text-gray-900">{aggStats.routeCount}</p>
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
                            <p className="text-sm text-gray-600">Total Stops</p>
                            <p className="text-2xl font-bold text-gray-900">{aggStats.totalStops}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-info-100 rounded-lg">
                            <FileText className="w-6 h-6 text-info-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Weight</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {aggStats.totalWeight > 0 ? `${aggStats.totalWeight.toFixed(1)} lbs` : '—'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-warning-100 rounded-lg">
                            <Clock className="w-6 h-6 text-warning-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Time</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {aggStats.totalTimeMinutes > 0
                                ? `${Math.floor(aggStats.totalTimeMinutes / 60)}h ${Math.round(aggStats.totalTimeMinutes % 60)}m`
                                : '—'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Stops Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Stops Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Completed Stops</span>
                            <span className="font-semibold text-success-600">{aggStats.completedStops}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Stops</span>
                            <span className="font-semibold text-gray-900">{aggStats.totalStops}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Skipped/Incomplete</span>
                            <span className="font-semibold text-gray-500">
                              {aggStats.totalStops - aggStats.completedStops}
                            </span>
                          </div>
                          <div className="pt-4 border-t">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-success-500 h-3 rounded-full transition-all"
                                style={{ width: `${aggStats.completionRate}%` }}
                              />
                            </div>
                            <p className="text-sm text-gray-500 mt-2 text-center">
                              {aggStats.completionRate}% completion rate
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Drivers */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Participating Drivers ({aggStats.driverCount})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {aggStats.driverNames.length > 0 ? (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {aggStats.driverNames.sort().map(name => (
                              <div
                                key={name}
                                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                              >
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-900">{name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">No drivers participated</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Routes List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Routes ({aggStats.routeCount})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {aggStats.routes.length > 0 ? (
                        <div className="space-y-3">
                          {aggStats.routes.map((route) => {
                            // Calculate route duration
                            let durationText = '—'
                            if (route.startedAt && route.weighedAt) {
                              const start = new Date(route.startedAt).getTime()
                              const end = new Date(route.weighedAt).getTime()
                              const minutes = Math.round((end - start) / (1000 * 60))
                              const hours = Math.floor(minutes / 60)
                              const mins = minutes % 60
                              durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
                            }
                            return (
                              <div key={route.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                    <CheckCircle className="w-4 h-4 text-success-600" />
                                    <span className="font-semibold text-gray-900">{route.name}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                    <span>Driver: {route.driverName}</span>
                                    <span>Stops: {route.completedStops}/{route.totalStops}</span>
                                    <span>Weight: {route.totalWeight ? `${route.totalWeight} lbs` : '—'}</span>
                                    <span>Time: {durationText}</span>
                                  </div>
                                </div>
                                <div className="text-xl font-bold text-success-600">
                                  {route.totalStops > 0 ? Math.round((route.completedStops / route.totalStops) * 100) : 0}%
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">No routes completed on selected dates</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )
            })()}
          </div>
        )}

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
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                          <span className="px-1.5 py-0.5 text-xs font-mono bg-gray-200 text-gray-600 rounded">
                            {formatUserId(driver.id)}
                          </span>
                        </div>
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
                      <span className="text-gray-600">Times Donated:</span>
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
