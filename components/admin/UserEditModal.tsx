'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '@/components/shared/Modal'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { User, Mail, Phone, Shield, Key, AlertTriangle, Truck, Heart, Users, Trash2, Home } from 'lucide-react'

interface UserData {
  id: number
  name: string
  email: string
  phone?: string | null
  role: string // Kept for backward compatibility
  isAdmin: boolean
  isDriver: boolean
  isDonor: boolean
  isVolunteer: boolean
  active: boolean
  hasPassword?: boolean
  bloomerangId?: string | null
  homeStreet?: string | null
  homeCity?: string | null
  homeState?: string | null
  homeZip?: string | null
}

interface UserEditModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData | null
  onSave: (user: UserData) => Promise<void>
  onSendPasswordReset?: (userId: number) => Promise<void>
  onDelete?: (userId: number, hardDelete: boolean) => Promise<void>
  currentUserId?: number
}

export function UserEditModal({
  isOpen,
  onClose,
  user,
  onSave,
  onSendPasswordReset,
  onDelete,
  currentUserId,
}: UserEditModalProps) {
  const [formData, setFormData] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

  const handleDelete = async (hardDelete: boolean) => {
    if (!onDelete || !formData) return

    setDeleting(true)
    try {
      await onDelete(formData.id, hardDelete)
      setShowDeleteConfirm(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeleting(false)
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

        {/* Home Address */}
        <div className="pt-3 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Home className="w-4 h-4 inline mr-1" />
            Home Address (for route assignment map)
          </label>
          <div className="space-y-2">
            <Input
              type="text"
              value={formData.homeStreet || ''}
              onChange={(e) => setFormData({ ...formData, homeStreet: e.target.value })}
              placeholder="Street address"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="text"
                value={formData.homeCity || ''}
                onChange={(e) => setFormData({ ...formData, homeCity: e.target.value })}
                placeholder="City"
              />
              <Input
                type="text"
                value={formData.homeState || ''}
                onChange={(e) => setFormData({ ...formData, homeState: e.target.value })}
                placeholder="State"
                maxLength={2}
              />
              <Input
                type="text"
                value={formData.homeZip || ''}
                onChange={(e) => setFormData({ ...formData, homeZip: e.target.value })}
                placeholder="Zip"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Used to show driver location on routes overview map
          </p>
        </div>

        {/* Roles - Multi-select checkboxes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Shield className="w-4 h-4 inline mr-1" />
            Roles
          </label>
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isAdmin}
                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                disabled={isCurrentUser && formData.isAdmin}
              />
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-700">Admin</span>
              <span className="text-xs text-gray-500">- Full system access</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isDriver}
                onChange={(e) => setFormData({ ...formData, isDriver: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <Truck className="w-4 h-4 text-primary-600" />
              <span className="text-sm text-gray-700">Driver</span>
              <span className="text-xs text-gray-500">- Food pickup routes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isDonor}
                onChange={(e) => setFormData({ ...formData, isDonor: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-700">Donor</span>
              <span className="text-xs text-gray-500">- Food donation</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isVolunteer}
                onChange={(e) => setFormData({ ...formData, isVolunteer: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-700">Volunteer</span>
              <span className="text-xs text-gray-500">- Hour tracking</span>
            </label>
          </div>
          {isCurrentUser && formData.isAdmin && (
            <p className="text-xs text-gray-500 mt-1">
              You cannot remove your own admin role
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

        {/* Delete User Section */}
        {onDelete && !isCurrentUser && (
          <div className="border-t pt-4 mt-4">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-danger-600 hover:text-danger-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete User...
              </button>
            ) : (
              <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm font-medium text-danger-900 mb-3">
                  Delete {formData.name}?
                </p>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(false)}
                    loading={deleting}
                    className="w-full"
                  >
                    Deactivate (soft delete)
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(true)}
                    loading={deleting}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4" />
                    Permanently Delete
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full text-sm text-gray-600 hover:text-gray-800 py-1"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-danger-700 mt-2">
                  Permanent deletion saves user data to changelog for potential restoration.
                </p>
              </div>
            )}
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
