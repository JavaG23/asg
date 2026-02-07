'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Clock, Calendar, History, HelpCircle, FileText } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface HourLog {
  id: number
  clockIn: string
  clockOut: string | null
  totalMinutes: number | null
  notes: string | null
  shiftDate: string | null
  shiftLocation: string | null
}

interface HoursData {
  logs: HourLog[]
  totalHours: number
  totalShifts: number
  hoursThisMonth: number
  hoursThisYear: number
}

export default function VolunteerHoursPage() {
  const router = useRouter()
  const { status } = useSession()
  const [data, setData] = useState<HoursData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchHours()
    }
  }, [status, router])

  const fetchHours = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/volunteer/hours')
      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to fetch hours')
      }

      setData(responseData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hours')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading your hours..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/volunteer/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">My Hours</h1>
            </div>
            <button
              onClick={() => router.push('/volunteer/help')}
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
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">
              {data?.totalHours.toFixed(1) || 0}
            </p>
            <p className="text-sm text-gray-600">Total Hours</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-gray-900">{data?.totalShifts || 0}</p>
            <p className="text-sm text-gray-600">Total Shifts</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">This Month</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {data?.hoursThisMonth.toFixed(1) || 0}h
            </p>
          </div>
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">This Year</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {data?.hoursThisYear.toFixed(1) || 0}h
            </p>
          </div>
        </div>

        {/* Hour Log */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            Hour Log
          </h2>

          {data?.logs && data.logs.length > 0 ? (
            <div className="space-y-3">
              {data.logs.map((log) => (
                <div
                  key={log.id}
                  className={`card ${!log.clockOut ? 'border-2 border-green-300 bg-green-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(log.clockIn).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Clock className="w-4 h-4" />
                        {new Date(log.clockIn).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' - '}
                        {log.clockOut
                          ? new Date(log.clockOut).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'In progress'}
                      </div>
                      {log.shiftLocation && (
                        <p className="text-sm text-gray-500 mt-1">{log.shiftLocation}</p>
                      )}
                      {log.notes && (
                        <p className="text-sm text-gray-500 mt-2 flex items-start gap-1">
                          <FileText className="w-3 h-3 mt-1 flex-shrink-0" />
                          {log.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {log.totalMinutes ? (
                        <span className="text-lg font-bold text-green-600">
                          {formatDuration(log.totalMinutes)}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No hours logged yet</p>
              <p className="text-sm mt-1">
                Clock in from the dashboard to start tracking your volunteer hours.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
