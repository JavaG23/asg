'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card, CardContent } from '@/components/shared/Card'

interface CSVUploadProps {
  onUploadComplete?: () => void
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Import Routes from CSV</h3>

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
              Drag and drop your CSV file here
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
              CSV file should contain: route_name, driver_name, driver_email, sequence_order, street_address, city, state, zip_code
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
            {result.success ? (
              <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-success-900 mb-1">
                      Import Successful!
                    </h4>
                    <p className="text-sm text-success-700">
                      Successfully imported {result.imported} route(s) with{' '}
                      {result.routes.reduce((acc: number, r: any) => acc + r.addresses.length, 0)}{' '}
                      total addresses.
                    </p>
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

            <Button variant="secondary" onClick={handleReset} className="w-full">
              Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
