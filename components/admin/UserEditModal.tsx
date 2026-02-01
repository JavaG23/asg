'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '@/components/shared/Modal'
import { Button } from '@/components/shared/Button'
import { Input, Select } from '@/components/shared/Input'
import { User, Mail, Phone, Shield, Key, AlertTriangle } from 'lucide-react'

interface UserData {
  id: number
  name: string
  email: string
  phone?: string | null
  role: string
  active: boolean
  hasPassword?: boolean
  bloomerangId?: string | null
}

interface UserEditModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData | null
  onSave: (user: UserData) => Promise<void>
  onSendPasswordReset?: (userId: number) => Promise<void>
  currentUserId?: number
}

export function UserEditModal({
  isOpen,
  onClose,
  user,
  onSave,
  onSendPasswordReset,
  currentUserId,
}: UserEditModalProps) {
  const [formData, setFormData] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setFormData({ ...user })
      setError(null)
    }
  }, [user])

  if (!formData) return null

  const isCurrentUser = currentUserId === formData.id

  // Format user ID as "USR-00042"
  const formatUserId = (id: number) => `USR-${id.toString().padStart(5, '0')}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return

    setSaving(true)
    setError(null)

    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleSendPasswordReset = async () => {
    if (!onSendPasswordReset || !formData) return

    setSendingReset(true)
    try {
      await onSendPasswordReset(formData.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset')
    } finally {
      setSendingReset(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User"
      size="md"
      showCloseButton={!saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User ID */}
        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
          <span className="text-sm text-gray-600">User ID</span>
          <span className="font-mono text-sm font-medium text-gray-900">{formatUserId(formData.id)}</span>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <User className="w-4 h-4 inline mr-1" />
            Name
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Mail className="w-4 h-4 inline mr-1" />
            Email
          </label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Phone className="w-4 h-4 inline mr-1" />
            Phone
          </label>
          <Input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Optional"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Shield className="w-4 h-4 inline mr-1" />
            Role
          </label>
          <Select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'driver', label: 'Driver' },
              { value: 'admin', label: 'Admin' },
            ]}
            disabled={isCurrentUser}
          />
          {isCurrentUser && (
            <p className="text-xs text-gray-500 mt-1">
              You cannot change your own role
            </p>
          )}
        </div>

        {/* Active Status */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              disabled={isCurrentUser}
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
          {isCurrentUser && (
            <p className="text-xs text-gray-500 mt-1 ml-6">
              You cannot deactivate your own account
            </p>
          )}
        </div>

        {/* Password Status */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Password Status:</span>
              <span className={`text-sm font-medium ${formData.hasPassword ? 'text-success-600' : 'text-warning-600'}`}>
                {formData.hasPassword ? 'Set' : 'Not Set'}
              </span>
            </div>
            {onSendPasswordReset && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSendPasswordReset}
                loading={sendingReset}
                disabled={sendingReset}
              >
                Send Reset Email
              </Button>
            )}
          </div>
        </div>

        {/* Bloomerang ID (read-only) */}
        {formData.bloomerangId && (
          <div className="text-sm text-gray-500">
            <span className="font-medium">Bloomerang ID:</span> {formData.bloomerangId}
          </div>
        )}

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
