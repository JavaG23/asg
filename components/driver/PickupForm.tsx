'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

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
}

export default function PickupForm({
  address,
  onComplete,
  loading = false,
}: PickupFormProps) {
  const [foodOutside, setFoodOutside] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [gettingLocation, setGettingLocation] = useState(false)

  const handleFoodOutsideChange = (value: boolean) => {
    setFoodOutside(value)

    // Show popup when "No" is selected
    if (value === false) {
      alert('Please leave a note on the door.')
    }
  }

  const handleComplete = async () => {
    // Validate that yes/no has been selected
    if (foodOutside === null) {
      alert('Please indicate whether the food was outside.')
      return
    }
    setGettingLocation(true)

    // Try to get GPS coordinates
    let gpsLatitude: number | undefined
    let gpsLongitude: number | undefined

    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            })
          }
        )
        gpsLatitude = position.coords.latitude
        gpsLongitude = position.coords.longitude
      } catch (error) {
        console.warn('Could not get GPS location:', error)
      }
    }

    setGettingLocation(false)

    await onComplete({
      foodOutside,
      notes: notes.trim(),
      gpsLatitude,
      gpsLongitude,
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

      {/* Food Outside Question */}
      <div>
        <label className="block text-base font-medium text-gray-900 mb-3">
          Was the food outside?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleFoodOutsideChange(true)}
            disabled={loading || gettingLocation}
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
            disabled={loading || gettingLocation}
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
          disabled={loading || gettingLocation}
          placeholder="Type any observations..."
          rows={4}
          className="input resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Actions */}
      <div>
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading || gettingLocation}
          className="w-full btn btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {gettingLocation
            ? 'Getting Location...'
            : loading
            ? 'Saving...'
            : 'Complete & Go to Next'}
        </button>
      </div>
    </div>
  )
}
