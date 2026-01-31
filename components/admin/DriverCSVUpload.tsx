'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, AlertTriangle, Users, Key, KeyRound, Mail, Send } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card, CardContent } from '@/components/shared/Card'

interface DriverCSVUploadProps {
  onUploadComplete?: () => void
}

export function DriverCSVUpload({ onUploadComplete }: DriverCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Email sending state
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([])
  const [sendingEmails, setSendingEmails] = useState(false)
  const [emailResult, setEmailResult] = useState<any>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setFile(selectedFile)
    setError(null)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import/drivers', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Failed to import drivers CSV')
        setResult(data)
      } else {
        setResult(data)
        if (onUploadComplete) {
          onUploadComplete()
        }
      }
    } catch (err) {
      setError('An error occurred while uploading the file')
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setSelectedDrivers([])
    setEmailResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Get drivers without passwords from result
  const driversNeedingPassword = result?.drivers?.filter((d: any) => !d.hasPassword) || []

  const handleSelectDriver = (driverId: number) => {
    setSelectedDrivers(prev =>
      prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    )
  }

  const handleSelectAll = () => {
    if (selectedDrivers.length === driversNeedingPassword.length) {
      setSelectedDrivers([])
    } else {
      setSelectedDrivers(driversNeedingPassword.map((d: any) => d.id))
    }
  }

  const handleSendEmails = async () => {
    if (selectedDrivers.length === 0) return

    setSendingEmails(true)
    setEmailResult(null)

    try {
      const response = await fetch('/api/auth/send-password-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverIds: selectedDrivers }),
      })

      const data = await response.json()
      setEmailResult(data)

      if (data.success && data.sent > 0) {
        // Clear selection for successfully sent
        setSelectedDrivers([])
      }
    } catch (err) {
      setEmailResult({ success: false, error: 'Failed to send emails' })
    } finally {
      setSendingEmails(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold">Import Drivers from CSV</h3>
        </div>

        {/* Upload Area */}
        {!file && !result && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drag and drop your volunteer list CSV here
            </p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
            />
            <p className="text-xs text-gray-500 mt-4">
              CSV should contain: Route, First Name, Last Name, Volunteer Email, Mobile Phone Number
            </p>
          </div>
        )}

        {/* File Selected */}
        {file && !result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={handleUpload}
                loading={uploading}
                className="flex-1"
              >
                Import Drivers
              </Button>
              <Button variant="secondary" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Upload Result */}
        {result && (
          <div className="space-y-4">
            {result.success ? (
              <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-success-900 mb-1">
                      Import Successful!
                    </h4>
                    <p className="text-sm text-success-700">
                      {result.imported > 0 && `Created ${result.imported} new driver(s). `}
                      {result.updated > 0 && `Updated ${result.updated} existing driver(s). `}
                      {result.imported === 0 && result.updated === 0 && 'No changes made.'}
                    </p>
                    {result.drivers && result.drivers.length > 0 && (
                      <div className="mt-3 max-h-40 overflow-y-auto">
                        <p className="text-xs font-medium text-success-800 mb-1">Drivers processed:</p>
                        <ul className="text-xs text-success-700 space-y-1">
                          {result.drivers.slice(0, 10).map((driver: any) => (
                            <li key={driver.id} className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                driver.isNew ? 'bg-success-200 text-success-800' : 'bg-gray-200 text-gray-700'
                              }`}>
                                {driver.isNew ? 'New' : 'Updated'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-xs flex items-center gap-1 ${
                                driver.hasPassword ? 'bg-primary-100 text-primary-800' : 'bg-warning-100 text-warning-800'
                              }`}>
                                {driver.hasPassword ? (
                                  <><Key className="w-3 h-3" /> Ready</>
                                ) : (
                                  <><KeyRound className="w-3 h-3" /> Needs Password</>
                                )}
                              </span>
                              {driver.name} ({driver.email})
                              {driver.routeNumber && ` → Route ${driver.routeNumber}`}
                            </li>
                          ))}
                        </ul>
                        {result.drivers.length > 10 && (
                          <p className="text-xs text-success-600 mt-1">
                            ...and {result.drivers.length - 10} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-danger-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-danger-900 mb-1">Import Failed</h4>
                    <p className="text-sm text-danger-700 mb-2">
                      {error || 'There were errors importing the CSV file'}
                    </p>
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-medium text-danger-900">Errors:</p>
                        <ul className="text-sm text-danger-700 list-disc list-inside">
                          {result.errors.slice(0, 5).map((err: any, i: number) => (
                            <li key={i}>
                              Row {err.row}: {err.message}
                            </li>
                          ))}
                        </ul>
                        {result.errors.length > 5 && (
                          <p className="text-sm text-danger-600">
                            ...and {result.errors.length - 5} more errors
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Password Status Summary */}
            {(result.driversWithPassword !== undefined || result.driversWithoutPassword !== undefined) && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-5 h-5 text-gray-600" />
                  <h4 className="font-medium text-gray-900">Password Status</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary-500"></span>
                    <span className="text-gray-700">{result.driversWithPassword || 0} Ready to login</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-warning-500"></span>
                    <span className="text-gray-700">{result.driversWithoutPassword || 0} Need password setup</span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning and Email Setup for drivers without passwords */}
            {result.driversWithoutPassword > 0 && (
              <div className="space-y-4">
                <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-warning-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-warning-900 mb-1">
                        Drivers Need Password Setup
                      </h4>
                      <p className="text-sm text-warning-700">
                        {result.driversWithoutPassword} driver(s) do not have passwords set.
                        Select drivers below to send password setup emails.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Driver Selection for Email */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-gray-600" />
                      <h4 className="font-medium text-gray-900">Send Password Setup Emails</h4>
                    </div>
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {selectedDrivers.length === driversNeedingPassword.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                    {driversNeedingPassword.map((driver: any) => (
                      <label
                        key={driver.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDrivers.includes(driver.id)}
                          onChange={() => handleSelectDriver(driver.id)}
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{driver.name}</p>
                          <p className="text-xs text-gray-500 truncate">{driver.email}</p>
                        </div>
                        {driver.routeNumber && (
                          <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                            Route {driver.routeNumber}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>

                  {/* Email Result */}
                  {emailResult && (
                    <div className={`p-3 rounded-lg mb-4 ${
                      emailResult.success && emailResult.sent > 0
                        ? 'bg-success-50 border border-success-200'
                        : emailResult.failed > 0
                        ? 'bg-warning-50 border border-warning-200'
                        : 'bg-gray-100 border border-gray-200'
                    }`}>
                      <p className={`text-sm ${
                        emailResult.success && emailResult.sent > 0
                          ? 'text-success-700'
                          : emailResult.failed > 0
                          ? 'text-warning-700'
                          : 'text-gray-700'
                      }`}>
                        {emailResult.message || emailResult.error}
                      </p>
                      {emailResult.errors?.length > 0 && (
                        <ul className="mt-2 text-xs text-warning-600">
                          {emailResult.errors.slice(0, 3).map((e: any, i: number) => (
                            <li key={i}>{e.email}: {e.error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={handleSendEmails}
                    loading={sendingEmails}
                    disabled={selectedDrivers.length === 0 || sendingEmails}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send to {selectedDrivers.length} Driver{selectedDrivers.length !== 1 ? 's' : ''}
                  </Button>

                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Emails contain a link to set their password (valid for 7 days)
                  </p>
                </div>
              </div>
            )}

            {/* Show partial success if some drivers were imported */}
            {!result.success && (result.imported > 0 || result.updated > 0) && (
              <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                <p className="text-sm text-warning-800">
                  Partial import: {result.imported} new, {result.updated} updated, {result.errors?.length || 0} errors
                </p>
              </div>
            )}

            <Button variant="secondary" onClick={handleReset} className="w-full">
              Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
