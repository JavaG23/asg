'use client'

import { useState, useEffect } from 'react'
import { Route, Users, MapPin, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shared/Card'
import { CSVUpload } from '@/components/admin/CSVUpload'
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

      {/* CSV Upload */}
      <CSVUpload onUploadComplete={handleUploadComplete} />

      {/* Today's Routes */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">All Routes</h2>
        <RouteList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}
