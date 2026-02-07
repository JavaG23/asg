'use client'

import { useState, useEffect, useMemo } from 'react'
import { Users, MapPin, CheckCircle, Download, Search, FileText, Calendar, Clock, TrendingUp, BarChart3, Package, MessageSquare, Building, Mail, Heart, UserX, RefreshCw } from 'lucide-react'
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
  foodOutsideYes?: number
  foodOutsideNo?: number
  foodOutsideNotes?: string[]
}

interface Report990Data {
  period: {
    startDate: string
    endDate: string
  }
  summary: {
    totalDonors: number
    totalInKindContributions: number
    totalVolunteers: number
    totalVolunteerHours: number
    totalRoutes: number
    totalStops: number
    completedStops: number
    foodOutsideYes: number
    foodOutsideNo: number
  }
  donors: Array<{
    name: string | null
    email: string | null
    phone: string | null
    address: string
    city: string
    state: string
    zip: string
    donationDates: string[]
    foodOutsideYes: number
    foodOutsideNo: number
    notes: string[]
  }>
  volunteers: Array<{
    name: string
    email: string
    phone: string | null
    routesCompleted: number
  }>
  routes: Array<{
    id: number
    name: string
    date: string
    driverName: string
    totalWeight: number | null
    totalStops: number
    completedStops: number
    volunteerHours: number
  }>
}

interface VolunteerHoursData {
  entries: Array<{
    id: number
    userName: string
    userEmail: string
    shiftDate: string | null
    shiftLocation: string | null
    clockIn: string
    clockOut: string | null
    totalMinutes: number | null
    notes: string | null
    isDriver: boolean
    isVolunteer: boolean
  }>
  summaries: Array<{
    userId: number
    userName: string
    userEmail: string
    totalHours: number
    totalSessions: number
    isDriver: boolean
    isVolunteer: boolean
  }>
  totals: {
    totalHours: number
    totalSessions: number
    uniqueVolunteers: number
    uniquePeopleCount: number
  }
  period: {
    startDate: string | null
    endDate: string | null
  }
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'events' | 'people' | 'places' | 'routes' | '990' | 'volunteer-hours' | 're-engagement'>('events')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [completedRoutes, setCompletedRoutes] = useState<CompletedRoute[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [selectedEventDates, setSelectedEventDates] = useState<Set<string>>(new Set())
  const [showingReport, setShowingReport] = useState(false)

  // 990 Report state
  const [report990Period, setReport990Period] = useState<'monthly' | 'annual' | 'custom'>('monthly')
  const [report990Month, setReport990Month] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [report990Year, setReport990Year] = useState(() => new Date().getFullYear().toString())
  const [report990StartDate, setReport990StartDate] = useState('')
  const [report990EndDate, setReport990EndDate] = useState('')
  const [report990Data, setReport990Data] = useState<Report990Data | null>(null)
  const [report990Loading, setReport990Loading] = useState(false)
  const [selectedDonors, setSelectedDonors] = useState<Set<number>>(new Set())
  const [donorFilter, setDonorFilter] = useState<'all' | 'food_not_outside' | 'with_email'>('all')
  const [sendingEmail, setSendingEmail] = useState(false)

  //################TEST CODE FOR HASH NAVIGATION####################
  // Handle URL hash for tab navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) // Remove the '#'
      if (hash === '990' || hash === 'events' || hash === 'people' ||
          hash === 'places' || hash === 'routes' || hash === 'volunteer-hours' || hash === 're-engagement') {
        setActiveTab(hash as typeof activeTab)
      }
    }

    // Check hash on mount
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Update URL hash when tab changes
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    window.location.hash = tab
  }

  // Volunteer Hours Report state
  const [volunteerHoursData, setVolunteerHoursData] = useState<VolunteerHoursData | null>(null)
  const [volunteerHoursLoading, setVolunteerHoursLoading] = useState(false)
  const [volunteerHoursStartDate, setVolunteerHoursStartDate] = useState('')
  const [volunteerHoursEndDate, setVolunteerHoursEndDate] = useState('')

  // Re-engagement state
  const [inactiveDonors, setInactiveDonors] = useState<Array<{
    id: number
    name: string
    email: string | null
    phone: string | null
    address: string | null
    lastActivityDate: string
    totalDonations: number
    daysSinceActivity: number
  }>>([])
  const [inactiveVolunteers, setInactiveVolunteers] = useState<Array<{
    id: number
    name: string
    email: string | null
    phone: string | null
    lastActivityDate: string
    totalHours: number
    daysSinceActivity: number
  }>>([])
  const [reengagementLoading, setReengagementLoading] = useState(false)
  const [inactiveDays, setInactiveDays] = useState(90)
  const [selectedInactiveDonors, setSelectedInactiveDonors] = useState<Set<number>>(new Set())
  const [selectedInactiveVolunteers, setSelectedInactiveVolunteers] = useState<Set<number>>(new Set())

  // Pickup events from database
  const [pickupEvents, setPickupEvents] = useState<{ date: string; label: string }[]>([])

  // Compute all event dates: pickup events + any dates with completed routes
  const eventDates = useMemo(() => {
    const dateSet = new Set<string>()

    // Add pickup event dates from database
    pickupEvents.forEach(e => dateSet.add(e.date))

    // Add dates from completed routes
    completedRoutes.forEach(route => {
      const routeDate = new Date(route.date).toISOString().split('T')[0]
      dateSet.add(routeDate)
    })

    // Convert to array with labels and sort by date
    const allDates = Array.from(dateSet).map(date => {
      const existing = pickupEvents.find(e => e.date === date)
      if (existing) return existing

      // Format label for dates not in pickup events
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
  }, [completedRoutes, pickupEvents])

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

    // Aggregate foodOutside data
    const foodOutsideYes = matchingRoutes.reduce((sum, r) => sum + (r.foodOutsideYes || 0), 0)
    const foodOutsideNo = matchingRoutes.reduce((sum, r) => sum + (r.foodOutsideNo || 0), 0)
    const allFoodOutsideNotes: string[] = []
    matchingRoutes.forEach(route => {
      if (route.foodOutsideNotes && route.foodOutsideNotes.length > 0) {
        allFoodOutsideNotes.push(...route.foodOutsideNotes.map(note => `[${route.name}] ${note}`))
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
      foodOutsideYes,
      foodOutsideNo,
      foodOutsideNotes: allFoodOutsideNotes,
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

      const [statsRes, driversRes, addressesRes, routesRes, eventsRes] = await Promise.all([
        fetch('/api/reports/stats'),
        fetch('/api/reports/drivers'),
        fetch('/api/reports/addresses'),
        fetch('/api/reports/completed-routes'),
        fetch('/api/admin/events'),
      ])

      if (!statsRes.ok || !driversRes.ok || !addressesRes.ok || !routesRes.ok) {
        throw new Error('Failed to fetch report data')
      }

      const [statsData, driversData, addressesData, routesData, eventsData] = await Promise.all([
        statsRes.json(),
        driversRes.json(),
        addressesRes.json(),
        routesRes.json(),
        eventsRes.json(),
      ])

      setStats(statsData.data)
      setDrivers(driversData.data || [])
      setAddresses(addressesData.data || [])
      setCompletedRoutes(routesData.data || [])

      // Process pickup events
      if (eventsData.success && eventsData.data) {
        const events = eventsData.data.map((event: { id: number; date: string }) => {
          const dateStr = new Date(event.date).toISOString().split('T')[0]
          const d = new Date(event.date)
          return {
            date: dateStr,
            label: d.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          }
        })
        setPickupEvents(events)
      }
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

  const handleExportEventReport = () => {
    const aggStats = getAggregatedStats()

    // Build CSV content
    const lines: string[] = []

    // Header section
    lines.push('ASG Event Report')
    lines.push(`Generated: ${new Date().toLocaleString()}`)
    lines.push('')

    // Selected dates
    lines.push('Event Dates:')
    aggStats.selectedDates.forEach(date => {
      const event = eventDates.find(e => e.date === date)
      lines.push(event?.label || date)
    })
    lines.push('')

    // Summary stats
    lines.push('Summary')
    lines.push(`Total Routes,${aggStats.routeCount}`)
    lines.push(`Total Stops,${aggStats.totalStops}`)
    lines.push(`Completed Stops,${aggStats.completedStops}`)
    lines.push(`Completion Rate,${aggStats.completionRate}%`)
    lines.push(`Total Weight,${aggStats.totalWeight > 0 ? aggStats.totalWeight.toFixed(1) + ' lbs' : 'N/A'}`)
    const hours = Math.floor(aggStats.totalTimeMinutes / 60)
    const mins = Math.round(aggStats.totalTimeMinutes % 60)
    lines.push(`Total Time,${aggStats.totalTimeMinutes > 0 ? `${hours}h ${mins}m` : 'N/A'}`)
    lines.push(`Unique Drivers,${aggStats.driverCount}`)
    lines.push(`Food Outside - Yes,${aggStats.foodOutsideYes}`)
    lines.push(`Food Outside - No,${aggStats.foodOutsideNo}`)
    lines.push('')

    // Participating drivers
    lines.push('Participating Drivers')
    aggStats.driverNames.sort().forEach(name => {
      lines.push(name)
    })
    lines.push('')

    // Routes detail
    lines.push('Routes Detail')
    lines.push('Route Name,Driver,Stops Completed,Total Stops,Completion %,Weight (lbs),Duration,Food Outside Yes,Food Outside No')
    aggStats.routes.forEach(route => {
      let durationText = 'N/A'
      if (route.startedAt && route.weighedAt) {
        const start = new Date(route.startedAt).getTime()
        const end = new Date(route.weighedAt).getTime()
        const minutes = Math.round((end - start) / (1000 * 60))
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        durationText = h > 0 ? `${h}h ${m}m` : `${m}m`
      }
      const completionPct = route.totalStops > 0 ? Math.round((route.completedStops / route.totalStops) * 100) : 0
      lines.push(`"${route.name}","${route.driverName}",${route.completedStops},${route.totalStops},${completionPct}%,${route.totalWeight || 'N/A'},${durationText},${route.foodOutsideYes || 0},${route.foodOutsideNo || 0}`)
    })

    // Driver notes section
    if (aggStats.foodOutsideNotes.length > 0) {
      lines.push('')
      lines.push('Driver Notes')
      aggStats.foodOutsideNotes.forEach(note => {
        lines.push(`"${note.replace(/"/g, '""')}"`)
      })
    }

    // Create and download CSV
    const csvContent = lines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateRange = aggStats.selectedDates.length === 1
      ? aggStats.selectedDates[0]
      : `${aggStats.selectedDates[0]}_to_${aggStats.selectedDates[aggStats.selectedDates.length - 1]}`
    a.download = `event_report_${dateRange}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // 990 Report functions
  const fetch990Report = async () => {
    let startDate: string
    let endDate: string

    if (report990Period === 'monthly') {
      const [year, month] = report990Month.split('-')
      startDate = `${year}-${month}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    } else if (report990Period === 'annual') {
      startDate = `${report990Year}-01-01`
      endDate = `${report990Year}-12-31`
    } else {
      startDate = report990StartDate
      endDate = report990EndDate
    }

    if (!startDate || !endDate) {
      alert('Please select a date range')
      return
    }

    setReport990Loading(true)
    try {
      const response = await fetch(`/api/reports/990-report?startDate=${startDate}&endDate=${endDate}`)
      if (!response.ok) throw new Error('Failed to fetch report')
      const result = await response.json()
      setReport990Data(result.data)
      setSelectedDonors(new Set())
    } catch (error) {
      console.error('Error fetching 990 report:', error)
      alert('Failed to generate report')
    } finally {
      setReport990Loading(false)
    }
  }

  const export990DonorList = () => {
    if (!report990Data) return

    const lines: string[] = []
    lines.push('Donor Name,Email,Phone,Street Address,City,State,ZIP,Donation Dates,Food Outside Yes,Food Outside No,Notes')

    report990Data.donors.forEach((donor) => {
      const name = donor.name || 'Unknown'
      const email = donor.email || ''
      const phone = donor.phone || ''
      const notes = donor.notes.join('; ').replace(/"/g, '""')
      lines.push(`"${name}","${email}","${phone}","${donor.address}","${donor.city}","${donor.state}","${donor.zip}","${donor.donationDates.join(', ')}",${donor.foodOutsideYes},${donor.foodOutsideNo},"${notes}"`)
    })

    downloadCSV(lines.join('\n'), '990_donor_list')
  }

  const export990InKindContributions = () => {
    if (!report990Data) return

    const lines: string[] = []
    lines.push('Event Date,Route Name,Driver Name,Total Weight (lbs),Stops Completed,Total Stops')

    report990Data.routes.forEach((route) => {
      const dateStr = new Date(route.date).toISOString().split('T')[0]
      lines.push(`"${dateStr}","${route.name}","${route.driverName || 'Unassigned'}",${route.totalWeight || 0},${route.completedStops},${route.totalStops}`)
    })

    // Add summary row
    lines.push('')
    lines.push(`Total,${report990Data.routes.length} routes,,${report990Data.summary.totalInKindContributions} lbs,${report990Data.summary.completedStops},${report990Data.summary.totalStops}`)

    downloadCSV(lines.join('\n'), '990_inkind_contributions')
  }

  const export990VolunteerList = () => {
    if (!report990Data) return

    const lines: string[] = []
    lines.push('Volunteer Name,Email,Phone,Routes Completed')

    report990Data.volunteers.forEach((volunteer) => {
      lines.push(`"${volunteer.name}","${volunteer.email}","${volunteer.phone || ''}",${volunteer.routesCompleted}`)
    })

    // Add summary row
    lines.push('')
    lines.push(`Total Unique Volunteers,${report990Data.summary.totalVolunteers}`)
    lines.push(`Total Volunteer Hours,${report990Data.summary.totalVolunteerHours}`)

    downloadCSV(lines.join('\n'), '990_volunteer_list')
  }

  const downloadCSV = (content: string, prefix: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateRange = report990Data
      ? `${new Date(report990Data.period.startDate).toISOString().split('T')[0]}_to_${new Date(report990Data.period.endDate).toISOString().split('T')[0]}`
      : new Date().toISOString().split('T')[0]
    a.download = `${prefix}_${dateRange}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // Volunteer Hours Report functions
  const fetchVolunteerHours = async () => {
    setVolunteerHoursLoading(true)
    try {
      const params = new URLSearchParams()
      if (volunteerHoursStartDate) params.append('startDate', volunteerHoursStartDate)
      if (volunteerHoursEndDate) params.append('endDate', volunteerHoursEndDate)

      const response = await fetch(`/api/reports/volunteer-hours?${params}`)
      if (!response.ok) throw new Error('Failed to fetch volunteer hours')
      const result = await response.json()
      setVolunteerHoursData(result.data)
    } catch (error) {
      console.error('Error fetching volunteer hours:', error)
      alert('Failed to fetch volunteer hours report')
    } finally {
      setVolunteerHoursLoading(false)
    }
  }

  const exportVolunteerHoursCSV = () => {
    if (!volunteerHoursData) return

    const lines: string[] = []
    lines.push('Volunteer Name,Email,Total Hours,Total Sessions,Is Driver,Is Volunteer')

    volunteerHoursData.summaries.forEach((summary) => {
      lines.push(`"${summary.userName}","${summary.userEmail}",${summary.totalHours.toFixed(1)},${summary.totalSessions},${summary.isDriver ? 'Yes' : 'No'},${summary.isVolunteer ? 'Yes' : 'No'}`)
    })

    // Add summary row
    lines.push('')
    lines.push(`Total,${volunteerHoursData.summaries.length} volunteers,${volunteerHoursData.totals.totalHours} hours,${volunteerHoursData.totals.totalSessions} sessions`)

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateRange = volunteerHoursStartDate && volunteerHoursEndDate
      ? `${volunteerHoursStartDate}_to_${volunteerHoursEndDate}`
      : new Date().toISOString().split('T')[0]
    a.download = `volunteer_hours_${dateRange}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const exportVolunteerHoursDetailedCSV = () => {
    if (!volunteerHoursData) return

    const lines: string[] = []
    lines.push('Volunteer Name,Email,Clock In,Clock Out,Total Hours,Shift Date,Location,Notes,Is Driver,Is Volunteer')

    volunteerHoursData.entries.forEach((entry) => {
      const clockIn = new Date(entry.clockIn).toLocaleString()
      const clockOut = entry.clockOut ? new Date(entry.clockOut).toLocaleString() : 'Active'
      const hours = entry.totalMinutes ? (entry.totalMinutes / 60).toFixed(1) : 'Active'
      const shiftDate = entry.shiftDate ? new Date(entry.shiftDate).toLocaleDateString() : ''
      const notes = entry.notes?.replace(/"/g, '""') || ''
      lines.push(`"${entry.userName}","${entry.userEmail}","${clockIn}","${clockOut}",${hours},"${shiftDate}","${entry.shiftLocation || ''}","${notes}",${entry.isDriver ? 'Yes' : 'No'},${entry.isVolunteer ? 'Yes' : 'No'}`)
    })

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateRange = volunteerHoursStartDate && volunteerHoursEndDate
      ? `${volunteerHoursStartDate}_to_${volunteerHoursEndDate}`
      : new Date().toISOString().split('T')[0]
    a.download = `volunteer_hours_detailed_${dateRange}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const toggleDonorSelection = (index: number) => {
    setSelectedDonors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const selectAllDonorsWithEmail = () => {
    if (!report990Data) return
    const newSet = new Set<number>()
    report990Data.donors.forEach((donor, index) => {
      if (donor.email) newSet.add(index)
    })
    setSelectedDonors(newSet)
  }

  const selectDonorsWithFoodNotOutside = () => {
    if (!report990Data) return
    const newSet = new Set<number>()
    report990Data.donors.forEach((donor, index) => {
      if (donor.email && donor.foodOutsideNo > 0) newSet.add(index)
    })
    setSelectedDonors(newSet)
  }

  const filteredDonors = useMemo(() => {
    if (!report990Data) return []
    return report990Data.donors.filter((donor) => {
      if (donorFilter === 'food_not_outside') {
        return donor.foodOutsideNo > 0
      }
      if (donorFilter === 'with_email') {
        return donor.email !== null
      }
      return true
    })
  }, [report990Data, donorFilter])

  const sendBulkEmail = async (type: 'food_not_outside' | 'reengagement' | 'thank_you') => {
    if (!report990Data || selectedDonors.size === 0) return

    const recipients = Array.from(selectedDonors)
      .map((index) => report990Data.donors[index])
      .filter((donor) => donor.email)
      .map((donor) => ({
        email: donor.email!,
        name: donor.name || 'Donor',
      }))

    if (recipients.length === 0) {
      alert('No donors with email addresses selected')
      return
    }

    const typeLabels = {
      food_not_outside: 'missed pickup notification',
      reengagement: 're-engagement email',
      thank_you: 'thank you email',
    }

    if (!confirm(`Send ${typeLabels[type]} to ${recipients.length} donor(s)?`)) {
      return
    }

    setSendingEmail(true)
    try {
      const response = await fetch('/api/admin/send-bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, recipients }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails')
      }

      alert(`Emails sent: ${data.data.sent} successful, ${data.data.failed} failed`)
      setSelectedDonors(new Set())
    } catch (error) {
      console.error('Error sending bulk email:', error)
      alert(error instanceof Error ? error.message : 'Failed to send emails')
    } finally {
      setSendingEmail(false)
    }
  }

  const fetchInactiveData = async () => {
    setReengagementLoading(true)
    try {
      const [donorsRes, volunteersRes] = await Promise.all([
        fetch(`/api/admin/inactive-donors?inactiveDays=${inactiveDays}`),
        fetch(`/api/admin/inactive-volunteers?inactiveDays=${inactiveDays}`),
      ])

      if (donorsRes.ok) {
        const donorsData = await donorsRes.json()
        setInactiveDonors(donorsData.data?.inactiveDonors || [])
      }

      if (volunteersRes.ok) {
        const volunteersData = await volunteersRes.json()
        setInactiveVolunteers(volunteersData.data?.inactiveVolunteers || [])
      }
    } catch (error) {
      console.error('Error fetching inactive data:', error)
    } finally {
      setReengagementLoading(false)
    }
  }

  const sendReengagementEmail = async (type: 'donor' | 'volunteer') => {
    const selectedIds = type === 'donor' ? selectedInactiveDonors : selectedInactiveVolunteers
    const items = type === 'donor' ? inactiveDonors : inactiveVolunteers

    const recipients = Array.from(selectedIds)
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => item !== undefined && item.email !== null)
      .map((item) => ({
        email: item.email!,
        name: item.name || (type === 'donor' ? 'Donor' : 'Volunteer'),
      }))

    if (recipients.length === 0) {
      alert(`No ${type}s with email addresses selected`)
      return
    }

    const emailType = type === 'donor' ? 'reengagement' : 'volunteer_reengagement'
    const typeLabel = type === 'donor' ? 'donor re-engagement' : 'volunteer re-engagement'

    if (!confirm(`Send ${typeLabel} email to ${recipients.length} ${type}(s)?`)) {
      return
    }

    setSendingEmail(true)
    try {
      const response = await fetch('/api/admin/send-bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: emailType, recipients }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails')
      }

      alert(`Emails sent: ${data.data.sent} successful, ${data.data.failed} failed`)
      if (type === 'donor') {
        setSelectedInactiveDonors(new Set())
      } else {
        setSelectedInactiveVolunteers(new Set())
      }
    } catch (error) {
      console.error('Error sending re-engagement email:', error)
      alert(error instanceof Error ? error.message : 'Failed to send emails')
    } finally {
      setSendingEmail(false)
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
           {  /* report buttons is hidden for now since. */}       
    
         {/***
        
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
  <button
            onClick={() => setActiveTab('990')}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === '990'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              990 Reports
            </div>
          </button>  
          */}
          <button
            onClick={() => setActiveTab('volunteer-hours')}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'volunteer-hours'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Volunteer Hours
            </div>
          </button>
          <button
            onClick={() => setActiveTab('re-engagement')}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 're-engagement'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Re-engagement
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
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleExportEventReport}>
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
                <Button variant="secondary" onClick={() => setShowingReport(false)}>
                  Back to Event Days
                </Button>
              </div>
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

                  {/* Food Outside Stats */}
                  {(aggStats.foodOutsideYes > 0 || aggStats.foodOutsideNo > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-success-100 rounded-lg">
                              <Package className="w-6 h-6 text-success-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Food Outside - Yes</p>
                              <p className="text-2xl font-bold text-success-600">{aggStats.foodOutsideYes}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-gray-100 rounded-lg">
                              <Package className="w-6 h-6 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Food Outside - No</p>
                              <p className="text-2xl font-bold text-gray-600">{aggStats.foodOutsideNo}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

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

                  {/* Driver Notes Section */}
                  {aggStats.foodOutsideNotes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Driver Notes ({aggStats.foodOutsideNotes.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {aggStats.foodOutsideNotes.map((note, index) => (
                            <div
                              key={index}
                              className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700"
                            >
                              {note}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

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
                                    {((route.foodOutsideYes || 0) > 0 || (route.foodOutsideNo || 0) > 0) && (
                                      <span className="flex items-center gap-1">
                                        <Package className="w-3 h-3" />
                                        Outside: {route.foodOutsideYes || 0}Y / {route.foodOutsideNo || 0}N
                                      </span>
                                    )}
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

        {/* 990 Reports Tab */}
        {activeTab === '990' && (
          <div className="space-y-6">
            {/* Period Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Report Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="period"
                        value="monthly"
                        checked={report990Period === 'monthly'}
                        onChange={() => setReport990Period('monthly')}
                        className="text-primary-600"
                      />
                      <span>Monthly</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="period"
                        value="annual"
                        checked={report990Period === 'annual'}
                        onChange={() => setReport990Period('annual')}
                        className="text-primary-600"
                      />
                      <span>Annual</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="period"
                        value="custom"
                        checked={report990Period === 'custom'}
                        onChange={() => setReport990Period('custom')}
                        className="text-primary-600"
                      />
                      <span>Custom Range</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-4 items-end">
                    {report990Period === 'monthly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <input
                          type="month"
                          value={report990Month}
                          onChange={(e) => setReport990Month(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    )}

                    {report990Period === 'annual' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <select
                          value={report990Year}
                          onChange={(e) => setReport990Year(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          {[2024, 2025, 2026, 2027].map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {report990Period === 'custom' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={report990StartDate}
                            onChange={(e) => setReport990StartDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                          <input
                            type="date"
                            value={report990EndDate}
                            onChange={(e) => setReport990EndDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </>
                    )}

                    <Button variant="primary" onClick={fetch990Report} disabled={report990Loading}>
                      {report990Loading ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Results */}
            {report990Data && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 rounded-lg">
                          <Heart className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Unique Donors</p>
                          <p className="text-2xl font-bold text-gray-900">{report990Data.summary.totalDonors}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary-100 rounded-lg">
                          <Package className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">In-Kind Contributions</p>
                          <p className="text-2xl font-bold text-gray-900">{report990Data.summary.totalInKindContributions.toLocaleString()} lbs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-success-100 rounded-lg">
                          <Users className="w-6 h-6 text-success-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Unique Volunteers</p>
                          <p className="text-2xl font-bold text-gray-900">{report990Data.summary.totalVolunteers}</p>
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
                          <p className="text-sm text-gray-600">Volunteer Hours</p>
                          <p className="text-2xl font-bold text-gray-900">{report990Data.summary.totalVolunteerHours}h</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Export Buttons */}
                <Card>
                  <CardHeader>
                    <CardTitle>Export CSV Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="secondary" onClick={export990DonorList}>
                        <Download className="w-4 h-4" />
                        Donor List ({report990Data.donors.length})
                      </Button>
                      <Button variant="secondary" onClick={export990InKindContributions}>
                        <Download className="w-4 h-4" />
                        In-Kind Contributions ({report990Data.routes.length} routes)
                      </Button>
                      <Button variant="secondary" onClick={export990VolunteerList}>
                        <Download className="w-4 h-4" />
                        Volunteer List ({report990Data.volunteers.length})
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-3">
                      These exports are formatted for 990 tax filing and grant applications.
                    </p>
                  </CardContent>
                </Card>

                {/* Donors Table with Email Selection */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <CardTitle>Donors ({filteredDonors.length}{donorFilter !== 'all' ? ` of ${report990Data.donors.length}` : ''})</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={donorFilter}
                          onChange={(e) => {
                            setDonorFilter(e.target.value as typeof donorFilter)
                            setSelectedDonors(new Set())
                          }}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="all">All Donors</option>
                          <option value="food_not_outside">Food Not Outside</option>
                          <option value="with_email">With Email Only</option>
                        </select>
                        {selectedDonors.size > 0 && (
                          <span className="text-sm text-gray-500">
                            {selectedDonors.size} selected
                          </span>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={selectAllDonorsWithEmail}
                        >
                          Select All
                        </Button>
                        {donorFilter === 'all' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={selectDonorsWithFoodNotOutside}
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
                          >
                            Select Missed Pickups
                          </Button>
                        )}
                        {selectedDonors.size > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedDonors(new Set())}
                          >
                            Deselect All
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Select</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Donor</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Email</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Address</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-600">Donations</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-600">Food Outside</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDonors.map((donor) => {
                            // Find original index for selection tracking
                            const originalIndex = report990Data.donors.findIndex(
                              (d) => d.address === donor.address && d.email === donor.email
                            )
                            return (
                              <tr key={originalIndex} className={`border-b hover:bg-gray-50 ${donor.foodOutsideNo > 0 ? 'bg-yellow-50' : ''}`}>
                                <td className="py-2 px-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedDonors.has(originalIndex)}
                                    onChange={() => toggleDonorSelection(originalIndex)}
                                    disabled={!donor.email}
                                    className="w-4 h-4 text-primary-600 rounded border-gray-300"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <span className={donor.name ? 'text-gray-900' : 'text-gray-400 italic'}>
                                    {donor.name || 'Unknown'}
                                  </span>
                                </td>
                                <td className="py-2 px-2">
                                  {donor.email ? (
                                    <a href={`mailto:${donor.email}`} className="text-primary-600 hover:underline flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {donor.email}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400 italic">No email</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-gray-600">
                                  {donor.address}, {donor.city}, {donor.state} {donor.zip}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {donor.donationDates.length}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className="text-success-600">{donor.foodOutsideYes}Y</span>
                                  {' / '}
                                  <span className={donor.foodOutsideNo > 0 ? 'text-yellow-600 font-medium' : 'text-gray-500'}>{donor.foodOutsideNo}N</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {selectedDonors.size > 0 && (
                      <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                        <p className="text-sm text-gray-700 mb-3">
                          Send email to {selectedDonors.size} selected donor(s):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => sendBulkEmail('thank_you')}
                            disabled={sendingEmail}
                          >
                            <Mail className="w-4 h-4" />
                            {sendingEmail ? 'Sending...' : 'Thank You / Re-engage'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => sendBulkEmail('food_not_outside')}
                            disabled={sendingEmail}
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
                          >
                            <Mail className="w-4 h-4" />
                            {sendingEmail ? 'Sending...' : 'Missed Pickup Notice'}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Emails include upcoming pickup dates for re-engagement.
                        </p>
                      </div>
                    )}
                    {filteredDonors.length === 0 && (
                      <p className="text-center py-8 text-gray-500">
                        No donors match the selected filter.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Volunteers List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Volunteers ({report990Data.volunteers.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {report990Data.volunteers.map((volunteer, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-success-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{volunteer.name}</p>
                            <p className="text-sm text-gray-500 truncate">{volunteer.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">{volunteer.routesCompleted}</p>
                            <p className="text-xs text-gray-500">routes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* No data state */}
            {!report990Data && !report990Loading && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">Select a reporting period and click "Generate Report"</p>
                  <p className="text-sm text-gray-500">
                    990 reports include donor lists, in-kind contributions, and volunteer data for tax filing.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Volunteer Hours Tab */}
        {activeTab === 'volunteer-hours' && (
          <div className="space-y-6">
            {/* Date Range Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Date Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={volunteerHoursStartDate}
                      onChange={(e) => setVolunteerHoursStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={volunteerHoursEndDate}
                      onChange={(e) => setVolunteerHoursEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <Button variant="primary" onClick={fetchVolunteerHours} disabled={volunteerHoursLoading}>
                    {volunteerHoursLoading ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4" />
                        Generate Report
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setVolunteerHoursStartDate('')
                    setVolunteerHoursEndDate('')
                    setVolunteerHoursData(null)
                  }}>
                    Clear
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Leave dates empty to view all volunteer hours. Dates are optional.
                </p>
              </CardContent>
            </Card>

            {/* Report Results */}
            {volunteerHoursData && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary-100 rounded-lg">
                          <Clock className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Hours</p>
                          <p className="text-2xl font-bold text-gray-900">{volunteerHoursData.totals.totalHours}h</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-success-100 rounded-lg">
                          <Users className="w-6 h-6 text-success-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Unique Volunteers</p>
                          <p className="text-2xl font-bold text-gray-900">{volunteerHoursData.totals.uniqueVolunteers}</p>
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
                          <p className="text-sm text-gray-600">Total Sessions</p>
                          <p className="text-2xl font-bold text-gray-900">{volunteerHoursData.totals.totalSessions}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-warning-100 rounded-lg">
                          <TrendingUp className="w-6 h-6 text-warning-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Avg Hours/Person</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {volunteerHoursData.totals.uniqueVolunteers > 0
                              ? (volunteerHoursData.totals.totalHours / volunteerHoursData.totals.uniqueVolunteers).toFixed(1)
                              : 0}h
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Export Buttons */}
                <Card>
                  <CardHeader>
                    <CardTitle>Export CSV Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="secondary" onClick={exportVolunteerHoursCSV}>
                        <Download className="w-4 h-4" />
                        Summary Report ({volunteerHoursData.summaries.length} volunteers)
                      </Button>
                      <Button variant="secondary" onClick={exportVolunteerHoursDetailedCSV}>
                        <Download className="w-4 h-4" />
                        Detailed Report ({volunteerHoursData.entries.length} sessions)
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-3">
                      Summary report shows total hours per volunteer. Detailed report includes individual clock in/out sessions.
                    </p>
                  </CardContent>
                </Card>

                {/* Volunteer Summary Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Volunteer Hours Summary ({volunteerHoursData.summaries.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {volunteerHoursData.summaries.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2 font-medium text-gray-600">Volunteer</th>
                              <th className="text-left py-2 px-2 font-medium text-gray-600">Email</th>
                              <th className="text-center py-2 px-2 font-medium text-gray-600">Total Hours</th>
                              <th className="text-center py-2 px-2 font-medium text-gray-600">Sessions</th>
                              <th className="text-center py-2 px-2 font-medium text-gray-600">Roles</th>
                            </tr>
                          </thead>
                          <tbody>
                            {volunteerHoursData.summaries.map((summary) => (
                              <tr key={summary.userId} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                      <Users className="w-4 h-4 text-primary-600" />
                                    </div>
                                    <span className="font-medium text-gray-900">{summary.userName}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-gray-600">{summary.userEmail}</td>
                                <td className="py-3 px-2 text-center">
                                  <span className="font-bold text-primary-600">{summary.totalHours.toFixed(1)}h</span>
                                </td>
                                <td className="py-3 px-2 text-center text-gray-600">{summary.totalSessions}</td>
                                <td className="py-3 px-2 text-center">
                                  <div className="flex justify-center gap-1">
                                    {summary.isDriver && (
                                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Driver</span>
                                    )}
                                    {summary.isVolunteer && (
                                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Volunteer</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No volunteer hours found for the selected period</p>
                    )}
                  </CardContent>
                </Card>

                {/* Detailed Sessions (collapsed by default) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Sessions ({volunteerHoursData.entries.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {volunteerHoursData.entries.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {volunteerHoursData.entries.slice(0, 20).map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{entry.userName}</span>
                                {!entry.clockOut && (
                                  <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">Active</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                <span>In: {new Date(entry.clockIn).toLocaleString()}</span>
                                {entry.clockOut && (
                                  <span className="ml-3">Out: {new Date(entry.clockOut).toLocaleString()}</span>
                                )}
                                {entry.shiftLocation && (
                                  <span className="ml-3">@ {entry.shiftLocation}</span>
                                )}
                              </div>
                              {entry.notes && (
                                <p className="text-sm text-gray-500 mt-1 italic">"{entry.notes}"</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary-600">
                                {entry.totalMinutes
                                  ? `${(entry.totalMinutes / 60).toFixed(1)}h`
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        ))}
                        {volunteerHoursData.entries.length > 20 && (
                          <p className="text-center text-sm text-gray-500 py-2">
                            Showing 20 of {volunteerHoursData.entries.length} sessions. Export to CSV for full list.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No sessions found</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* No data state */}
            {!volunteerHoursData && !volunteerHoursLoading && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">Click "Generate Report" to view volunteer hours</p>
                  <p className="text-sm text-gray-500">
                    This report shows volunteer clock in/out sessions and total hours worked.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Re-engagement Tab */}
        {activeTab === 're-engagement' && (
          <div className="space-y-6">
            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Re-engagement Campaign
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Find inactive donors and volunteers who haven&apos;t participated recently and send them re-engagement emails.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="inactiveDays" className="text-sm font-medium text-gray-700">
                      Inactive for:
                    </label>
                    <select
                      id="inactiveDays"
                      value={inactiveDays}
                      onChange={(e) => setInactiveDays(parseInt(e.target.value))}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>180 days</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>
                  <Button
                    variant="primary"
                    onClick={fetchInactiveData}
                    disabled={reengagementLoading}
                  >
                    {reengagementLoading ? 'Loading...' : 'Find Inactive Users'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Inactive Donors Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Inactive Donors ({inactiveDonors.length})
                  </CardTitle>
                  {selectedInactiveDonors.size > 0 && (
                    <Button
                      variant="primary"
                      onClick={() => sendReengagementEmail('donor')}
                      disabled={sendingEmail}
                    >
                      <Mail className="w-4 h-4" />
                      Send Re-engagement Email ({selectedInactiveDonors.size})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {inactiveDonors.length > 0 ? (
                  <>
                    <div className="mb-3 flex items-center gap-2">
                      <button
                        className="text-sm text-primary-600 hover:text-primary-700"
                        onClick={() => {
                          const withEmail = inactiveDonors.filter(d => d.email).map(d => d.id)
                          setSelectedInactiveDonors(
                            selectedInactiveDonors.size === withEmail.length
                              ? new Set()
                              : new Set(withEmail)
                          )
                        }}
                      >
                        {selectedInactiveDonors.size === inactiveDonors.filter(d => d.email).length
                          ? 'Deselect All'
                          : 'Select All with Email'}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 w-10"></th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Name</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Email</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-600">Donations</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-600">Days Inactive</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Last Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inactiveDonors.map((donor) => (
                            <tr key={donor.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2">
                                <input
                                  type="checkbox"
                                  checked={selectedInactiveDonors.has(donor.id)}
                                  disabled={!donor.email}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedInactiveDonors)
                                    if (e.target.checked) {
                                      newSet.add(donor.id)
                                    } else {
                                      newSet.delete(donor.id)
                                    }
                                    setSelectedInactiveDonors(newSet)
                                  }}
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                              </td>
                              <td className="py-3 px-2 font-medium text-gray-900">{donor.name}</td>
                              <td className="py-3 px-2 text-gray-600">{donor.email || <span className="text-gray-400 italic">No email</span>}</td>
                              <td className="py-3 px-2 text-center">{donor.totalDonations}</td>
                              <td className="py-3 px-2 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  donor.daysSinceActivity > 180
                                    ? 'bg-red-100 text-red-700'
                                    : donor.daysSinceActivity > 90
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {donor.daysSinceActivity} days
                                </span>
                              </td>
                              <td className="py-3 px-2 text-gray-600">
                                {new Date(donor.lastActivityDate).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {reengagementLoading ? 'Loading...' : 'Click "Find Inactive Users" to search for inactive donors'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Inactive Volunteers Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserX className="w-5 h-5 text-orange-500" />
                    Inactive Volunteers ({inactiveVolunteers.length})
                  </CardTitle>
                  {selectedInactiveVolunteers.size > 0 && (
                    <Button
                      variant="primary"
                      onClick={() => sendReengagementEmail('volunteer')}
                      disabled={sendingEmail}
                    >
                      <Mail className="w-4 h-4" />
                      Send Re-engagement Email ({selectedInactiveVolunteers.size})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {inactiveVolunteers.length > 0 ? (
                  <>
                    <div className="mb-3 flex items-center gap-2">
                      <button
                        className="text-sm text-primary-600 hover:text-primary-700"
                        onClick={() => {
                          const withEmail = inactiveVolunteers.filter(v => v.email).map(v => v.id)
                          setSelectedInactiveVolunteers(
                            selectedInactiveVolunteers.size === withEmail.length
                              ? new Set()
                              : new Set(withEmail)
                          )
                        }}
                      >
                        {selectedInactiveVolunteers.size === inactiveVolunteers.filter(v => v.email).length
                          ? 'Deselect All'
                          : 'Select All with Email'}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 w-10"></th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Name</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Email</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-600">Total Hours</th>
                            <th className="text-center py-2 px-2 font-medium text-gray-600">Days Inactive</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Last Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inactiveVolunteers.map((volunteer) => (
                            <tr key={volunteer.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2">
                                <input
                                  type="checkbox"
                                  checked={selectedInactiveVolunteers.has(volunteer.id)}
                                  disabled={!volunteer.email}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedInactiveVolunteers)
                                    if (e.target.checked) {
                                      newSet.add(volunteer.id)
                                    } else {
                                      newSet.delete(volunteer.id)
                                    }
                                    setSelectedInactiveVolunteers(newSet)
                                  }}
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                              </td>
                              <td className="py-3 px-2 font-medium text-gray-900">{volunteer.name}</td>
                              <td className="py-3 px-2 text-gray-600">{volunteer.email || <span className="text-gray-400 italic">No email</span>}</td>
                              <td className="py-3 px-2 text-center">{volunteer.totalHours}h</td>
                              <td className="py-3 px-2 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  volunteer.daysSinceActivity > 180
                                    ? 'bg-red-100 text-red-700'
                                    : volunteer.daysSinceActivity > 90
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {volunteer.daysSinceActivity} days
                                </span>
                              </td>
                              <td className="py-3 px-2 text-gray-600">
                                {new Date(volunteer.lastActivityDate).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {reengagementLoading ? 'Loading...' : 'Click "Find Inactive Users" to search for inactive volunteers'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
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
