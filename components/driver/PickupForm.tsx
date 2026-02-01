'use client'

import { useState } from 'react'
import { Check, X, Package } from 'lucide-react'

interface PickupFormProps {
  address: {
    id: number
    streetAddress: string
    city: string
    state: string
    zipCode: string
  }
  onComplete: (data: {
    foodOutside: boolean | null
    notes: string
    gpsLatitude?: number
    gpsLongitude?: number
  }) => Promise<void>
  loading?: boolean
  routeType?: string // 'pickup' | 'bag_delivery'
}

export default function PickupForm({
  address,
  onComplete,
  loading = false,
  routeType = 'pickup',
}: PickupFormProps) {
  const [foodOutside, setFoodOutside] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')

  const isBagDelivery = routeType === 'bag_delivery'

  const handleFoodOutsideChange = (value: boolean) => {
    setFoodOutside(value)

    // Show popup when "No" is selected (only for pickup routes)
    if (value === false && !isBagDelivery) {
      alert('Please leave a note on the door.')
    }
  }

  const handleComplete = async () => {
    // For pickup routes, validate that yes/no has been selected
    // For bag delivery routes, skip the food outside validation
    if (!isBagDelivery && foodOutside === null) {
      alert('Please indicate whether the food was outside.')
      return
    }

    await onComplete({
      foodOutside: isBagDelivery ? null : foodOutside,
      notes: notes.trim(),
    })
  }

  return (
    <div className="space-y-6">
      {/* Address Display */}
      <div className="card bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {address.streetAddress}
        </h3>
        <p className="text-sm text-gray-600">
          {address.city}, {address.state} {address.zipCode}
        </p>
      </div>

      {/* Bag Delivery Confirmation */}
      {isBagDelivery ? (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-6 h-6 text-purple-600" />
            <h3 className="font-semibold text-purple-900">Bag Delivery</h3>
          </div>
          <p className="text-sm text-purple-700">
            Confirm that the donation bag has been delivered to this address.
          </p>
        </div>
      ) : (
        /* Food Outside Question - only for pickup routes */
        <div>
          <label className="block text-base font-medium text-gray-900 mb-3">
            Was the food outside?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleFoodOutsideChange(true)}
              disabled={loading}
              className={`py-4 px-6 rounded-lg border-2 transition-all ${
                foodOutside === true
                  ? 'border-success-500 bg-success-50 text-success-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              <Check className="w-5 h-5" />
              <span className="font-medium">Yes</span>
            </button>
            <button
              type="button"
              onClick={() => handleFoodOutsideChange(false)}
              disabled={loading}
              className={`py-4 px-6 rounded-lg border-2 transition-all ${
                foodOutside === false
                  ? 'border-danger-500 bg-danger-50 text-danger-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              <X className="w-5 h-5" />
              <span className="font-medium">No</span>
            </button>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-base font-medium text-gray-900 mb-2"
        >
          Additional Notes <span className="text-gray-500">(Optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
          placeholder={isBagDelivery ? "Any notes about the delivery..." : "Type any observations..."}
          rows={4}
          className="input resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Actions */}
      <div>
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="w-full btn btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Saving...'
            : isBagDelivery
              ? 'Confirm Delivery & Go to Next'
              : 'Complete & Go to Next'}
        </button>
      </div>
    </div>
  )
}
