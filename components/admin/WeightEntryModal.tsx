'use client'

import { useState } from 'react'
import { Modal, ModalFooter } from '@/components/shared/Modal'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Scale, AlertTriangle } from 'lucide-react'

interface WeightEntryModalProps {
  isOpen: boolean
  onClose: () => void
  routeId: number
  routeName: string
  onSave: (weight: number) => Promise<void>
}

export function WeightEntryModal({
  isOpen,
  onClose,
  routeId,
  routeName,
  onSave,
}: WeightEntryModalProps) {
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const weightValue = parseFloat(weight)
    if (isNaN(weightValue) || weightValue <= 0) {
      setError('Please enter a valid weight greater than 0')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(weightValue)
      setWeight('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save weight')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      setWeight('')
      setError(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enter Route Weight"
      size="sm"
      showCloseButton={!saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg">
          <Scale className="w-8 h-8 text-primary-600" />
          <div>
            <p className="font-medium text-gray-900">{routeName}</p>
            <p className="text-sm text-gray-600">Enter the total food weight collected</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Weight (lbs)
          </label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g., 125.5"
            required
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the weight in pounds as measured at the distribution center
          </p>
        </div>

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
            Save Weight & Complete Route
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
