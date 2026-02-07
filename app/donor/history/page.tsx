'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, History, Calendar, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface DonationRecord {
  id: number
  date: string
  status: 'completed' | 'cancelled' | 'missed'
  notes: string | null
}

export default function DonorHistoryPage() {
  const router = useRouter()
  const { status } = useSession()
  const [history, setHistory] = useState<DonationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchHistory()
    }
  }, [status, router])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/donor/history')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch history')
      }

      setHistory(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading donation history..." />
  }

  const stats = {
    total: history.length,
    completed: history.filter((h) => h.status === 'completed').length,
    cancelled: history.filter((h) => h.status === 'cancelled').length,
    missed: history.filter((h) => h.status === 'missed').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/donor/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Donation History</h1>
            </div>
            <button
              onClick={() => router.push('/donor/help')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto space-y-6">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-gray-600">Completed</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.cancelled}</p>
            <p className="text-xs text-gray-600">Cancelled</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.missed}</p>
            <p className="text-xs text-gray-600">Missed</p>
          </div>
        </div>

        {/* History List */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            Past Pickups
          </h2>

          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className={`card ${
                    record.status === 'completed'
                      ? 'border-l-4 border-l-green-500'
                      : record.status === 'missed'
                      ? 'border-l-4 border-l-yellow-500'
                      : 'border-l-4 border-l-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-gray-500 mt-1">{record.notes}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                        record.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : record.status === 'missed'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {record.status === 'completed' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : record.status === 'missed' ? (
                        <XCircle className="w-3 h-3" />
                      ) : null}
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-500">
              <History className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No donation history yet</p>
              <p className="text-sm mt-1">
                Your completed pickups will appear here.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
