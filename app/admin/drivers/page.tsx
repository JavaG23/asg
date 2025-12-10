'use client'

import { useState, useEffect } from 'react'
import { Users, Mail, Phone, Route, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/drivers')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch drivers')
      }

      setDrivers(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drivers')
      console.error('Error fetching drivers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrivers()
  }, [])

  if (loading) {
    return <Loading fullScreen text="Loading drivers..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Error Loading Drivers"
        message={error}
        onDismiss={() => setError(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <p className="text-gray-600 mt-1">Manage volunteer drivers and their assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Drivers</p>
                <p className="text-3xl font-bold text-gray-900">{drivers.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary-50">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Drivers</p>
                <p className="text-3xl font-bold text-gray-900">
                  {drivers.filter((d) => d.active).length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-success-50">
                <TrendingUp className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Routes</p>
                <p className="text-3xl font-bold text-gray-900">
                  {drivers.reduce((sum, d) => sum + d.stats.totalRoutes, 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50">
                <Route className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drivers List */}
      <div className="grid gap-4">
        {drivers.map((driver) => (
          <Card key={driver.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{driver.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {driver.email}
                        </div>
                        {driver.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {driver.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-gray-600">Total Routes</p>
                      <p className="text-xl font-bold text-gray-900">{driver.stats.totalRoutes}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Completed</p>
                      <p className="text-xl font-bold text-success-600">{driver.stats.completedRoutes}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Deliveries</p>
                      <p className="text-xl font-bold text-primary-600">{driver.stats.totalDeliveries}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    driver.active
                      ? 'bg-success-100 text-success-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {driver.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
