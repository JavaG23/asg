'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/shared/Modal'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { User, Mail, Phone, Calendar, CheckCircle, MapPin, Clock } from 'lucide-react'

interface DriverProfileModalProps {
  isOpen: boolean
  onClose: () => void
  driverId: number
}

interface DriverDetails {
  id: number
  name: string
  email: string
  phone?: string
  bloomerangId?: string
  routesCompleted: number
  totalRoutes: number
  totalStops: number
  completedStops: number
  volunteerHours: number
  routeHistory: Array<{
    id: number
    name: string
    date: string
    status: string
    totalStops: number
    completedStops: number
  }>
  recentDeliveries: Array<{
    id: number
    completedAt: string
    address: {
      streetAddress: string
      city: string
      state: string
    }
  }>
}

export function DriverProfileModal({ isOpen, onClose, driverId }: DriverProfileModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [driver, setDriver] = useState<DriverDetails | null>(null)

  useEffect(() => {
    if (isOpen && driverId) {
      fetchDriverDetails()
    }
  }, [isOpen, driverId])

  const fetchDriverDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/reports/drivers/${driverId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch driver details')
      }

      const data = await response.json()
      setDriver(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load driver details')
      console.error('Error fetching driver details:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Driver Profile" size="xl">
      {loading && <Loading text="Loading driver profile..." />}

      {error && <ErrorMessage message={error} />}

      {driver && (
        <div className="space-y-6">
          {/* Driver Info Card */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{driver.name}</h2>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${driver.email}`} className="hover:underline">
                      {driver.email}
                    </a>
                  </div>
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${driver.phone}`} className="hover:underline">
                        {driver.phone}
                      </a>
                    </div>
                  )}
                  {driver.bloomerangId && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-xs font-medium">Bloomerang ID:</span>
                      <span>{driver.bloomerangId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Routes Completed</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{driver.routesCompleted}</p>
              <p className="text-xs text-gray-500">of {driver.totalRoutes} total</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium">Stops Completed</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{driver.completedStops}</p>
              <p className="text-xs text-gray-500">of {driver.totalStops} total</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">Volunteer Hours</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{driver.volunteerHours}</p>
              <p className="text-xs text-gray-500">Estimated</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Completion Rate</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {driver.totalStops > 0
                  ? Math.round((driver.completedStops / driver.totalStops) * 100)
                  : 0}
                %
              </p>
              <p className="text-xs text-gray-500">Overall</p>
            </div>
          </div>

          {/* Route History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Route History</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {driver.routeHistory.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Route</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">Stops</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {driver.routeHistory.map((route) => (
                        <tr key={route.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{route.name}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(route.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                route.status === 'completed'
                                  ? 'bg-success-100 text-success-700'
                                  : route.status === 'active'
                                  ? 'bg-primary-100 text-primary-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {route.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {route.completedStops}/{route.totalStops}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-500">No route history available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
