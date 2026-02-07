'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, AlertTriangle, Route, Calendar, Plus } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card, CardContent } from '@/components/shared/Card'

// Special option for bag routes not tied to events
const BAG_ROUTE_OPTION = { value: 'bag-route', label: 'Bag Route (No Event Date)' }

// Format a date string to a readable label
const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface CSVUploadProps {
  onUploadComplete?: () => void
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [eventDate, setEventDate] = useState<string>('')
  const [eventDates, setEventDates] = useState<{ value: string; label: string }[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [newDate, setNewDate] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch pickup events from the database
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/admin/events')
        const data = await response.json()
        if (data.success && data.data) {
          const dates = data.data.map((event: { id: number; date: string }) => {
            const dateStr = new Date(event.date).toISOString().split('T')[0]
            return {
              value: dateStr,
              label: formatDateLabel(dateStr),
            }
          }).sort((a: { value: string }, b: { value: string }) => a.value.localeCompare(b.value))
          setEventDates(dates)
        }
      } catch (err) {
        console.error('Error fetching events:', err)
      } finally {
        setLoadingEvents(false)
      }
    }
    fetchEvents()
  }, [])

  // Handle adding a new custom date (creates a PickupEvent)
  const handleAddDate = async () => {
    if (!newDate) return

    // Check if date already exists
    const exists = eventDates.some(d => d.value === newDate)
    if (exists) {
      setShowDatePicker(false)
      setEventDate(newDate)
      setNewDate('')
      return
    }

    // Create a new pickup event in the database
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate }),
      })
      const data = await response.json()

      if (data.success) {
        // Add the new date to the list
        const newDateOption = {
          value: newDate,
          label: formatDateLabel(newDate),
        }
        setEventDates(prev => [...prev, newDateOption].sort((a, b) => a.value.localeCompare(b.value)))
        setEventDate(newDate)
      } else {
        alert(data.error || 'Failed to create event')
      }
    } catch (err) {
      console.error('Error creating event:', err)
      alert('Failed to create event')
    }

    setShowDatePicker(false)
    setNewDate('')
  }

  // Handle dropdown change
  const handleDateChange = (value: string) => {
    if (value === 'add-new') {
      setShowDatePicker(true)
    } else {
      setEventDate(value)
    }
  }

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

    if (!eventDate) {
      setError('Please select an event date')
      return
    }

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // For bag routes, use today's date and set route type
      if (eventDate === 'bag-route') {
        formData.append('eventDate', new Date().toISOString().split('T')[0])
        formData.append('routeType', 'bag_delivery')
      } else {
        formData.append('eventDate', eventDate)
        formData.append('routeType', 'pickup')
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Failed to import CSV')
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
    setEventDate('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Route className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold">Import Routes from CSV</h3>
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
              Drag and drop your route list CSV here
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
              Required: Route #, Stop #, street address. Optional: driver email (auto-assigns if provided)
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

            {/* Event Date Selection */}
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                <label className="font-medium text-primary-900">
                  Select Event Date <span className="text-danger-500">*</span>
                </label>
              </div>
              <select
                value={eventDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">-- Select Event Date --</option>
                <option value="add-new" className="font-medium text-primary-600">
                  + Add New Date...
                </option>
                <option value={BAG_ROUTE_OPTION.value}>
                  {BAG_ROUTE_OPTION.label}
                </option>
                <option disabled>──────────────</option>
                {eventDates.map((date) => (
                  <option key={date.value} value={date.value}>
                    {date.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-primary-700 mt-2">
                {eventDate === 'bag-route'
                  ? 'Bag delivery routes are not tied to a specific event date'
                  : 'Routes will be associated with this event date'}
              </p>
            </div>

            {/* Date Picker Modal */}
            {showDatePicker && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Add New Event Date</h3>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={handleAddDate}
                      disabled={!newDate}
                      className="flex-1"
                    >
                      Add Date
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowDatePicker(false)
                        setNewDate('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {error && !result && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={handleUpload}
                loading={uploading}
                className="flex-1"
              >
                Import Routes
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
            {result.success || result.imported > 0 ? (
              <>
                <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-success-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-success-900 mb-1">
                        Import Successful!
                      </h4>
                      <p className="text-sm text-success-700">
                        Successfully imported {result.imported} route(s) with{' '}
                        {result.routes?.reduce((acc: number, r: any) => acc + r.addresses.length, 0) || 0}{' '}
                        total addresses.
                      </p>
                      {/* Driver assignment summary */}
                      {(result.routesWithDrivers !== undefined || result.routesWithoutDrivers !== undefined) && (
                        <div className="mt-2 text-sm text-success-700">
                          <p>• {result.routesWithDrivers || 0} route(s) with drivers assigned</p>
                          <p>• {result.routesWithoutDrivers || 0} route(s) need driver assignment</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Warning for routes without drivers */}
                {result.routesWithoutDrivers > 0 && (
                  <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-warning-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-warning-900 mb-1">
                          Routes Need Driver Assignment
                        </h4>
                        <p className="text-sm text-warning-700">
                          {result.routesWithoutDrivers} route(s) were created without drivers.
                          Use the Routes page to manually assign drivers, or upload drivers first using the Volunteer List CSV.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show any warnings/errors even on success */}
                {result.errors && result.errors.length > 0 && (
                  <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-warning-900 mb-1">Warnings:</p>
                        <ul className="text-sm text-warning-700 space-y-1">
                          {result.errors.slice(0, 5).map((err: any, i: number) => (
                            <li key={i}>
                              {err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}
                            </li>
                          ))}
                        </ul>
                        {result.errors.length > 5 && (
                          <p className="text-sm text-warning-600 mt-1">
                            ...and {result.errors.length - 5} more
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
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
                              {err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}
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

            <Button variant="secondary" onClick={handleReset} className="w-full">
              Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
