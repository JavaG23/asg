'use client'

import { MapPin, Info } from 'lucide-react'

interface AddressCardProps {
  address: {
    id: number
    sequenceOrder: number
    streetAddress: string
    city: string
    state: string
    zipCode: string
    specialInstructions?: string | null
    status: string
  }
  isNextStop?: boolean
  isFirstStop?: boolean
  onNavigate?: () => void
  showActions?: boolean
}

export default function AddressCard({
  address,
  isNextStop = false,
  isFirstStop = false,
  onNavigate,
  showActions = true,
}: AddressCardProps) {
  const statusColors = {
    pending: 'bg-gray-100 text-gray-700',
    completed: 'bg-success-100 text-success-700',
    skipped: 'bg-warning-100 text-warning-700',
  }

  const statusColor =
    statusColors[address.status as keyof typeof statusColors] ||
    'bg-gray-100 text-gray-700'

  return (
    <div
      className={`card ${
        isNextStop
          ? 'border-2 border-primary-500 bg-primary-50'
          : 'border border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-600" />
          <span className="text-lg font-semibold text-gray-900">
            {isNextStop ? 'NEXT STOP' : `Stop ${address.sequenceOrder}`}
          </span>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}
        >
          {address.status.charAt(0).toUpperCase() + address.status.slice(1)}
        </span>
      </div>

      <div className="space-y-1 mb-3">
        <p className="text-base font-medium text-gray-900">
          {address.streetAddress}
        </p>
        <p className="text-sm text-gray-600">
          {address.city}, {address.state} {address.zipCode}
        </p>
      </div>

      {address.specialInstructions && (
        <div className="flex items-start gap-2 p-3 bg-info-50 border border-info-200 rounded-lg mb-3">
          <Info className="w-4 h-4 text-info-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-info-900">
            {address.specialInstructions}
          </p>
        </div>
      )}

      {showActions && onNavigate && (
        <button
          onClick={onNavigate}
          className="w-full btn btn-primary py-3 text-base"
        >
          {isFirstStop ? 'Begin Route' : 'Navigate to Next Stop'}
        </button>
      )}
    </div>
  )
}
