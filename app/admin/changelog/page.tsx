'use client'

import { useState, useEffect } from 'react'
import { History, User, Route, MapPin, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Select } from '@/components/shared/Input'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface ChangeLog {
  id: number
  userId: number | null
  userName: string | null
  action: string
  entityType: string
  entityId: number
  entityName: string | null
  field: string | null
  oldValue: string | null
  newValue: string | null
  metadata: string | null
  createdAt: string
}

const ENTITY_ICONS: Record<string, typeof User> = {
  user: User,
  route: Route,
  address: MapPin,
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-success-100 text-success-700',
  update: 'bg-primary-100 text-primary-700',
  delete: 'bg-danger-100 text-danger-700',
  import: 'bg-info-100 text-info-700',
}

export default function ChangeLogPage() {
  const [logs, setLogs] = useState<ChangeLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('')
  const [actionFilter, setActionFilter] = useState<string>('')
  const [page, setPage] = useState(0)
  const limit = 25

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (entityTypeFilter) params.set('entityType', entityTypeFilter)
      if (actionFilter) params.set('action', actionFilter)
      params.set('limit', limit.toString())
      params.set('offset', (page * limit).toString())

      const response = await fetch(`/api/admin/changelog?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch change logs')
      }

      setLogs(data.data)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load change logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [entityTypeFilter, actionFilter, page])

  const formatValue = (value: string | null): string => {
    if (value === null) return '-'
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'boolean') return parsed ? 'Yes' : 'No'
      if (parsed === null) return '-'
      return String(parsed)
    } catch {
      return value
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const totalPages = Math.ceil(total / limit)

  if (loading && logs.length === 0) {
    return <Loading fullScreen text="Loading change logs..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change Log</h1>
          <p className="text-gray-600 mt-1">Audit trail of all database modifications</p>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex items-center gap-4 p-3">
          <Filter className="w-5 h-5 text-gray-400" />
          <Select
            label=""
            value={entityTypeFilter}
            onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(0) }}
            options={[
              { value: '', label: 'All Entities' },
              { value: 'user', label: 'Users' },
              { value: 'route', label: 'Routes' },
              { value: 'address', label: 'Addresses' },
            ]}
            className="w-40"
          />
          <Select
            label=""
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0) }}
            options={[
              { value: '', label: 'All Actions' },
              { value: 'create', label: 'Created' },
              { value: 'update', label: 'Updated' },
              { value: 'delete', label: 'Deleted' },
              { value: 'import', label: 'Imported' },
            ]}
            className="w-40"
          />
          <span className="text-sm text-gray-500 ml-auto">
            {total} total entries
          </span>
        </div>
      </Card>

      {error && (
        <ErrorMessage
          title="Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Change Log List */}
      <div className="space-y-3">
        {logs.map((log) => {
          const Icon = ENTITY_ICONS[log.entityType] || History
          const actionColor = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'

          return (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${actionColor}`}>
                        {log.action}
                      </span>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {log.entityType}
                      </span>
                      {log.entityName && (
                        <span className="text-sm text-gray-600">
                          "{log.entityName}"
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-mono">
                        ID: {log.entityId}
                      </span>
                    </div>

                    {log.field && (
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">{log.field}:</span>{' '}
                        <span className="text-gray-400">{formatValue(log.oldValue)}</span>
                        <span className="mx-2">→</span>
                        <span className="text-gray-900 font-medium">{formatValue(log.newValue)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {log.userName || 'System'}
                      </span>
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {logs.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No change logs found</p>
              <p className="text-sm text-gray-400 mt-1">
                Changes to users, routes, and addresses will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
