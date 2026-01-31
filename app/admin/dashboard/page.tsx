'use client'

import { useState, useEffect } from 'react'
import { Route, Users, MapPin, TrendingUp, Calendar, CheckCircle, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shared/Card'
import { CSVUpload } from '@/components/admin/CSVUpload'
import { DriverCSVUpload } from '@/components/admin/DriverCSVUpload'
import { RouteList } from '@/components/admin/RouteList'
import { Loading } from '@/components/shared/Loading'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRoutes: 0,
    activeRoutes: 0,
    totalDrivers: 0,
    totalStops: 0,
    completedStops: 0,
    percentComplete: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/routes')
      const data = await response.json()

      if (data.success) {
        const routes = data.data
        const totalStops = routes.reduce((sum: number, r: any) => sum + r.stats.totalStops, 0)
        const completedStops = routes.reduce((sum: number, r: any) => sum + r.stats.completedStops, 0)

        setStats({
          totalRoutes: routes.length,
          activeRoutes: routes.filter((r: any) => r.status === 'active').length,
          totalDrivers: new Set(routes.map((r: any) => r.driverId).filter(Boolean)).size,
          totalStops,
          completedStops,
          percentComplete: totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0,
        })
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [refreshTrigger])

  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  // ASG Event Dates
  const eventDates = [
    { date: new Date('2026-02-07'), label: 'February 7, 2026' },
    { date: new Date('2026-04-18'), label: 'April 18, 2026' },
    { date: new Date('2026-06-06'), label: 'June 6, 2026' },
    { date: new Date('2026-10-03'), label: 'October 3, 2026' },
    { date: new Date('2027-08-08'), label: 'August 8, 2027' },
  ]

  const getEventStatus = (eventDate: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const event = new Date(eventDate)
    event.setHours(0, 0, 0, 0)

    if (event < today) return 'past'
    if (event.getTime() === today.getTime()) return 'today'
    return 'upcoming'
  }

  const statCards = [
    {
      title: 'Total Routes',
      value: stats.totalRoutes,
      icon: Route,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      title: 'Active Routes',
      value: stats.activeRoutes,
      icon: TrendingUp,
      color: 'text-success-600',
      bgColor: 'bg-success-50',
    },
    {
      title: 'Active Drivers',
      value: stats.totalDrivers,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Stops',
      value: `${stats.completedStops} / ${stats.totalStops}`,
      icon: MapPin,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      subtitle: `${stats.percentComplete}% Complete`,
    },
  ]

  if (loading) {
    return <Loading fullScreen text="Loading dashboard..." />
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    {stat.subtitle && (
                      <p className="text-sm text-gray-500 mt-1">
                        {stat.subtitle}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Upcoming Event Days */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">ASG Event Days</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {eventDates.map((event) => {
            const status = getEventStatus(event.date)
            return (
              <Card key={event.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      status === 'past' ? 'bg-gray-100' :
                      status === 'today' ? 'bg-success-100' :
                      'bg-primary-100'
                    }`}>
                      <Calendar className={`w-5 h-5 ${
                        status === 'past' ? 'text-gray-500' :
                        status === 'today' ? 'text-success-600' :
                        'text-primary-600'
                      }`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        status === 'past' ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        {event.label}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {status === 'past' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400">Completed</span>
                          </>
                        ) : status === 'today' ? (
                          <>
                            <Clock className="w-3 h-3 text-success-600" />
                            <span className="text-xs text-success-600 font-medium">Today</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-primary-500" />
                            <span className="text-xs text-primary-600">Upcoming</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* CSV Uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DriverCSVUpload onUploadComplete={handleUploadComplete} />
        <CSVUpload onUploadComplete={handleUploadComplete} />
      </div>

      {/* Today's Routes */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">All Routes</h2>
        <RouteList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}
