'use client'

import { useState, useEffect } from 'react'
import { X, User, Mail, Phone, Link2, History, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'

interface DonorAddress {
  id: number
  streetAddress: string
  city: string
  state: string
  zipCode: string
  status: string
  route: {
    id: number
    name: string
    date: string
    status: string
  }
  deliveryLogs?: {
    id: number
    completedAt: string
    notes?: string
  }[]
}

interface DonorData {
  id: number
  name: string
  email: string | null
  phone: string | null
  userId: number | null
  linkedUser?: {
    id: number
    name: string
    email: string
    active: boolean
  } | null
  addresses?: DonorAddress[]
  stats?: {
    totalDonations: number
    completedDonations: number
    uniqueEvents: number
  }
  createdAt?: string
  updatedAt?: string
}

interface DonorEditModalProps {
  isOpen: boolean
  onClose: () => void
  donor: DonorData | null
  onSave: (donorData: DonorData) => Promise<void>
}

export function DonorEditModal({
  isOpen,
  onClose,
  donor,
  onSave,
}: DonorEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (donor) {
      setFormData({
        name: donor.name || '',
        email: donor.email || '',
        phone: donor.phone || '',
      })
      setError(null)
    }
  }, [donor])

  if (!isOpen || !donor) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSave({
        ...donor,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save donor')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDonorId = (id: number) => `DNR-${id.toString().padStart(5, '0')}`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Donor</h2>
            <p className="text-sm font-mono text-gray-500">{formatDonorId(donor.id)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
              {error}
            </div>
          )}

          {/* Stats Summary */}
          {donor.stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-primary-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary-700">
                  {donor.stats.totalDonations}
                </p>
                <p className="text-xs text-primary-600">Total Donations</p>
              </div>
              <div className="bg-success-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-success-700">
                  {donor.stats.completedDonations}
                </p>
                <p className="text-xs text-success-600">Completed</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">
                  {donor.stats.uniqueEvents}
                </p>
                <p className="text-xs text-purple-600">Events</p>
              </div>
            </div>
          )}

          {/* Linked User Info */}
          {donor.linkedUser && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Linked User Account</span>
              </div>
              <p className="text-sm text-blue-700">
                {donor.linkedUser.name} ({donor.linkedUser.email})
                {!donor.linkedUser.active && (
                  <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">Inactive</span>
                )}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </form>

          {/* Donation History Toggle */}
          {donor.addresses && donor.addresses.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <History className="w-4 h-4" />
                {showHistory ? 'Hide' : 'Show'} Donation History ({donor.addresses.length})
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {donor.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {addr.streetAddress}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 ml-6">
                            {addr.city}, {addr.state} {addr.zipCode}
                          </p>
                          <div className="flex items-center gap-2 mt-1 ml-6">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {formatDate(addr.route.date)} - {addr.route.name}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            addr.status === 'completed'
                              ? 'bg-success-100 text-success-700'
                              : addr.status === 'skipped'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-warning-100 text-warning-700'
                          }`}
                        >
                          {addr.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            className="flex-1"
          >
            Save Changes
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
