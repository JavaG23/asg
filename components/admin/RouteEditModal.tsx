'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '@/components/shared/Modal'
import { Button } from '@/components/shared/Button'
import { Input, Select } from '@/components/shared/Input'
import { Route, Calendar, Flag, AlertTriangle, Package } from 'lucide-react'

interface RouteData {
  id: number
  name: string
  date: string
  status: string
  routeType?: string
}

interface RouteEditModalProps {
  isOpen: boolean
  onClose: () => void
  route: RouteData | null
  onSave: (routeData: { name: string; date: string; status: string; routeType: string }) => Promise<void>
}

export function RouteEditModal({
  isOpen,
  onClose,
  route,
  onSave,
}: RouteEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    status: '',
    routeType: 'pickup',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (route) {
      // Format date for input (YYYY-MM-DD)
      const dateStr = new Date(route.date).toISOString().split('T')[0]
      setFormData({
        name: route.name,
        date: dateStr,
        status: route.status,
        routeType: route.routeType || 'pickup',
      })
      setError(null)
    }
  }, [route])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError('Route name is required')
      return
    }

    if (!formData.date) {
      setError('Date is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save route')
    } finally {
      setSaving(false)
    }
  }

  if (!route) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Route"
      size="md"
      showCloseButton={!saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Route Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Route className="w-4 h-4 inline mr-1" />
            Route Name
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Route 1 - North"
            required
          />
        </div>

        {/* Route Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Package className="w-4 h-4 inline mr-1" />
            Route Type
          </label>
          <Select
            value={formData.routeType}
            onChange={(e) => setFormData({ ...formData, routeType: e.target.value })}
            options={[
              { value: 'pickup', label: 'Food Pickup (collect donations)' },
              { value: 'bag_delivery', label: 'Bag Delivery (deliver bags to new donors)' },
            ]}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.routeType === 'bag_delivery'
              ? 'Bag delivery routes skip the weight entry step'
              : 'Pickup routes require weight entry when completed'}
          </p>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date
          </label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Flag className="w-4 h-4 inline mr-1" />
            Status
          </label>
          <Select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'active', label: 'Active' },
              { value: 'pending_weight', label: 'Pending Weight' },
              { value: 'completed', label: 'Completed' },
            ]}
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
            onClick={onClose}
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
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
