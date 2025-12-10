'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/shared/Modal'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { MapPin, Calendar, CheckCircle, XCircle, FileText, User } from 'lucide-react'

interface AddressProfileModalProps {
  isOpen: boolean
  onClose: () => void
  addressId: number
}

interface AddressDetails {
  id: number
  streetAddress: string
  city: string
  state: string
  zipCode: string
  latitude?: number
  longitude?: number
  specialInstructions?: string
  status: string
  routeName?: string
  routeDate?: string
  totalDeliveries: number
  foodOutsideCount: number
  foodInsideCount: number
  lastDeliveryDate?: string
  lastDeliveryDriver?: string
  deliveryHistory: Array<{
    id: number
    driverName: string
    completedAt: string
    foodOutside: boolean | null
    notes?: string
    gpsLatitude?: number
    gpsLongitude?: number
  }>
}

export function AddressProfileModal({ isOpen, onClose, addressId }: AddressProfileModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState<AddressDetails | null>(null)

  useEffect(() => {
    if (isOpen && addressId) {
      fetchAddressDetails()
    }
  }, [isOpen, addressId])

  const fetchAddressDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/reports/addresses/${addressId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch address details')
      }

      const data = await response.json()
      setAddress(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load address details')
      console.error('Error fetching address details:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Place Profile" size="xl">
      {loading && <Loading text="Loading place details..." />}

      {error && <ErrorMessage message={error} />}

      {address && (
        <div className="space-y-6">
          {/* Address Info Card */}
          <div className="bg-gradient-to-r from-success-50 to-success-100 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-success-600 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{address.streetAddress}</h2>
                <p className="text-lg text-gray-700 mb-2">
                  {address.city}, {address.state} {address.zipCode}
                </p>
                {address.specialInstructions && (
                  <div className="bg-info-50 border border-info-200 rounded-lg p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-info-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-info-900 mb-1">
                          Special Instructions
                        </p>
                        <p className="text-sm text-info-700">{address.specialInstructions}</p>
                      </div>
                    </div>
                  </div>
                )}
                {address.latitude && address.longitude && (
                  <p className="text-xs text-gray-600 mt-2">
                    GPS: {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Total Deliveries</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{address.totalDeliveries}</p>
              {address.lastDeliveryDate && (
                <p className="text-xs text-gray-500">
                  Last: {new Date(address.lastDeliveryDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <CheckCircle className="w-4 h-4 text-success-600" />
                <span className="text-xs font-medium">Food Outside</span>
              </div>
              <p className="text-2xl font-bold text-success-700">{address.foodOutsideCount}</p>
              <p className="text-xs text-gray-500">
                {address.totalDeliveries > 0
                  ? Math.round((address.foodOutsideCount / address.totalDeliveries) * 100)
                  : 0}
                %
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <XCircle className="w-4 h-4 text-danger-600" />
                <span className="text-xs font-medium">Food Inside</span>
              </div>
              <p className="text-2xl font-bold text-danger-700">{address.foodInsideCount}</p>
              <p className="text-xs text-gray-500">
                {address.totalDeliveries > 0
                  ? Math.round((address.foodInsideCount / address.totalDeliveries) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>

          {/* Last Driver */}
          {address.lastDeliveryDriver && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Driver</p>
                  <p className="text-sm text-gray-600">{address.lastDeliveryDriver}</p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Delivery History</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {address.deliveryHistory.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Driver</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">
                          Food Outside
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {address.deliveryHistory.map((delivery) => (
                        <tr key={delivery.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">
                            {new Date(delivery.completedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{delivery.driverName}</td>
                          <td className="px-4 py-3">
                            {delivery.foodOutside !== null ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                                  delivery.foodOutside
                                    ? 'bg-success-100 text-success-700'
                                    : 'bg-danger-100 text-danger-700'
                                }`}
                              >
                                {delivery.foodOutside ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" /> Yes
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3" /> No
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                            {delivery.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No delivery history available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Donor Contact Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <span className="font-medium">Note:</span> Donor contact information should be
              managed through your CRM system or contact database.
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}
