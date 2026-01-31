'use client'

import { useState } from 'react'
import { Modal, ModalFooter } from '@/components/shared/Modal'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { MapPin, AlertTriangle } from 'lucide-react'

interface AddAddressModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (addressData: {
    streetAddress: string
    city: string
    state: string
    zipCode: string
    specialInstructions?: string
  }) => Promise<void>
}

export function AddAddressModal({
  isOpen,
  onClose,
  onSave,
}: AddAddressModalProps) {
  const [formData, setFormData] = useState({
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    specialInstructions: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setFormData({
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      specialInstructions: '',
    })
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.streetAddress.trim()) {
      setError('Street address is required')
      return
    }

    if (!formData.city.trim()) {
      setError('City is required')
      return
    }

    if (!formData.state.trim()) {
      setError('State is required')
      return
    }

    if (!formData.zipCode.trim()) {
      setError('Zip code is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(formData)
      resetForm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add address')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Stop"
      size="md"
      showCloseButton={!saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Street Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin className="w-4 h-4 inline mr-1" />
            Street Address
          </label>
          <Input
            type="text"
            value={formData.streetAddress}
            onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
            placeholder="123 Main Street"
            required
          />
        </div>

        {/* City, State, Zip */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <Input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <Input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="NY"
              required
              maxLength={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zip Code
            </label>
            <Input
              type="text"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              placeholder="12345"
              required
            />
          </div>
        </div>

        {/* Special Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions (Optional)
          </label>
          <textarea
            value={formData.specialInstructions}
            onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
            className="input resize-none"
            rows={2}
            placeholder="e.g., Use side door, gate code 1234"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            disabled={saving}
          >
            Add Stop
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
