'use client'

import { useState } from 'react'
import { RouteList } from '@/components/admin/RouteList'
import { CSVUpload } from '@/components/admin/CSVUpload'
import { Button } from '@/components/shared/Button'
import { FileUp } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'

export default function RoutesPage() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadComplete = () => {
    setShowUploadModal(false)
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routes</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all delivery routes</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowUploadModal(true)}
        >
          <FileUp className="w-5 h-5" />
          Import CSV
        </Button>
      </div>

      {/* Routes List */}
      <RouteList refreshTrigger={refreshTrigger} />

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Import Routes"
        size="lg"
      >
        <CSVUpload onUploadComplete={handleUploadComplete} />
      </Modal>
    </div>
  )
}
