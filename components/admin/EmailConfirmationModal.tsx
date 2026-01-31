'use client'

import { useState } from 'react'
import { Modal, ModalFooter } from '@/components/shared/Modal'
import { Button } from '@/components/shared/Button'
import { Mail, MailX, AlertTriangle, User, MapPin, Calendar } from 'lucide-react'

interface EmailConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (sendEmail: boolean) => void
  driverName: string
  driverEmail: string
  routeName: string
  routeDate: string
  stopCount: number
  hasPassword: boolean
  isLoading?: boolean
}

export function EmailConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  driverName,
  driverEmail,
  routeName,
  routeDate,
  stopCount,
  hasPassword,
  isLoading = false,
}: EmailConfirmationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Driver to Route"
      size="md"
      showCloseButton={!isLoading}
    >
      <div className="space-y-4">
        {/* Assignment Summary */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900">{driverName}</p>
              <p className="text-sm text-gray-500">{driverEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900">{routeName}</p>
              <p className="text-sm text-gray-500">{stopCount} stop{stopCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <p className="text-gray-900">{routeDate}</p>
          </div>
        </div>

        {/* Password Warning */}
        {!hasPassword && (
          <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-warning-800">
              <p className="font-medium">Driver has no password set</p>
              <p>If you send an email, it will include a link to set their password.</p>
            </div>
          </div>
        )}

        {/* Email Confirmation */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600 mb-4">
            Would you like to send an email notification to <strong>{driverEmail}</strong> about this route assignment?
          </p>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">Email will include:</p>
            <ul className="list-disc list-inside text-blue-700 space-y-0.5">
              <li>Route name and date</li>
              <li>Number of pickup stops</li>
              <li>Link to view their route</li>
              {!hasPassword && <li>Link to set their password</li>}
            </ul>
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={() => onConfirm(false)}
          disabled={isLoading}
        >
          <MailX className="w-4 h-4 mr-2" />
          Don&apos;t Send Email
        </Button>
        <Button
          variant="primary"
          onClick={() => onConfirm(true)}
          loading={isLoading}
          disabled={isLoading}
        >
          <Mail className="w-4 h-4 mr-2" />
          Send Email
        </Button>
      </ModalFooter>
    </Modal>
  )
}
