'use client'

// 65j: opportunity type detail page. The compact tiles on My Opportunities
// link here; this page holds the full description, details, manager contact,
// and the kind-appropriate action. Sign-up for shift/routes kinds happens on
// the calendar (linked from here) to keep the driver-role flow in one place.

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Clock,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  Users,
  X,
} from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/shared/Button'

interface OpportunityType {
  id: number
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  iconUrl: string | null
  managerName: string | null
  managerPhone: string | null
  hasManager: boolean
  kind: 'shifts' | 'routes' | 'self-reported' | 'registration'
}

interface Shift {
  id: number
  date: string
  startTime: string
  endTime: string
  location: string
  spotsAvailable: number
  userStatus: 'none' | 'pending' | 'approved' | 'waitlisted' | 'cancelled'
}

const KIND_LABELS: Record<string, string> = {
  shifts: 'Sign up for a shift',
  routes: 'Driver routes',
  'self-reported': 'Self-reported hours',
  registration: 'Community partner registration',
}

export default function OpportunityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { status } = useSession()
  const typeId = Number(params.id)

  const [type, setType] = useState<OpportunityType | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Contact Manager modal
  const [showContact, setShowContact] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [contactResult, setContactResult] = useState<string | null>(null)

  // Register modal
  const [showRegister, setShowRegister] = useState(false)
  const [regDate, setRegDate] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regMessage, setRegMessage] = useState('')
  const [registering, setRegistering] = useState(false)
  const [regResult, setRegResult] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, typeId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const typesRes = await fetch('/api/volunteer/opportunity-types')
      const typesData = await typesRes.json()
      if (!typesRes.ok) throw new Error(typesData.error || 'Failed to load opportunity')
      const found = typesData.data.types.find((t: OpportunityType) => t.id === typeId)
      if (!found) {
        setError('This opportunity is not available.')
        return
      }
      setType(found)

      if (found.kind === 'shifts' || found.kind === 'routes') {
        const oppsRes = await fetch(`/api/volunteer/opportunities?type=${typeId}`)
        const oppsData = await oppsRes.json()
        if (oppsRes.ok) setShifts(oppsData.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunity')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!message.trim() || !type) return
    setSending(true)
    setContactResult(null)
    try {
      const response = await fetch('/api/volunteer/contact-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityTypeId: type.id, message }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send message')
      setContactResult('Message sent! The manager will reply to your email.')
      setMessage('')
    } catch (err) {
      setContactResult(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleRegister = async () => {
    if (!regDate || !type) return
    setRegistering(true)
    setRegResult(null)
    try {
      const response = await fetch('/api/volunteer/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityTypeId: type.id,
          plannedDate: regDate,
          phone: regPhone,
          message: regMessage,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to submit registration')
      setRegResult(data.message || 'Registration submitted!')
      setRegDate('')
      setRegMessage('')
    } catch (err) {
      setRegResult(err instanceof Error ? err.message : 'Failed to submit registration')
    } finally {
      setRegistering(false)
    }
  }

  if (status === 'loading' || loading) {
    return <Loading text="Loading opportunity..." />
  }

  if (error || !type) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <button
          onClick={() => router.push('/volunteer/my-opportunities')}
          className="flex items-center gap-2 text-gray-700 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <ErrorMessage message={error || 'Opportunity not found'} />
      </div>
    )
  }

  const upcoming = shifts
    .filter((s) => new Date(s.date) >= new Date())
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/volunteer/my-opportunities')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 truncate">{type.name}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto pb-8">
        {/* Cover banner + icon */}
        <div className="relative">
          {type.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={type.imageUrl} alt="" className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-32 bg-green-100" />
          )}
          <div className="absolute -bottom-8 left-4 w-16 h-16 rounded-xl bg-white shadow-md flex items-center justify-center overflow-hidden border border-gray-200">
            {type.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={type.iconUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <HeartHandshake className="w-8 h-8 text-green-600" />
            )}
          </div>
        </div>

        <div className="p-4 pt-12 space-y-5">
          <div>
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              {KIND_LABELS[type.kind] || type.kind}
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">{type.name}</h2>
          </div>

          {type.description && (
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">{type.description}</p>
          )}

          {/* Manager contact */}
          {(type.managerName || type.managerPhone || type.hasManager) && (
            <div className="card bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-2">Questions?</h3>
              {type.managerName && (
                <p className="text-sm text-gray-600">{type.managerName}</p>
              )}
              {type.managerPhone && (
                <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                  <Phone className="w-4 h-4" />
                  {type.managerPhone}
                </p>
              )}
              {type.hasManager && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowContact(true)}
                >
                  <Mail className="w-4 h-4" />
                  Contact Manager
                </Button>
              )}
            </div>
          )}

          {/* Kind-specific action */}
          {type.kind === 'self-reported' && (
            <Button
              variant="primary"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => router.push(`/volunteer/hours?log=1&type=${type.id}`)}
            >
              <Clock className="w-5 h-5" />
              Log Hours
            </Button>
          )}

          {type.kind === 'registration' && (
            <Button
              variant="primary"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => setShowRegister(true)}
            >
              <ClipboardList className="w-5 h-5" />
              Register
            </Button>
          )}

          {(type.kind === 'shifts' || type.kind === 'routes') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Upcoming times</h3>
                <button
                  onClick={() => router.push(`/volunteer/opportunities?type=${type.id}`)}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  View calendar
                </button>
              </div>
              {upcoming.length > 0 ? (
                <div className="space-y-2">
                  {upcoming.map((s) => (
                    <div key={s.id} className="card flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {new Date(s.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {s.startTime} - {s.endTime}
                          <MapPin className="w-3 h-3 ml-2" />
                          {s.location}
                        </p>
                      </div>
                      {s.userStatus !== 'none' ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          {s.userStatus.charAt(0).toUpperCase() + s.userStatus.slice(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {s.spotsAvailable > 0 ? `${s.spotsAvailable} open` : 'Waitlist'}
                        </span>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="primary"
                    className="w-full bg-green-600 hover:bg-green-700 mt-1"
                    onClick={() => router.push(`/volunteer/opportunities?type=${type.id}`)}
                  >
                    <Calendar className="w-5 h-5" />
                    View available times & sign up
                  </Button>
                </div>
              ) : (
                <div className="card text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No upcoming times scheduled yet. Check back soon!</p>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Contact Manager Modal */}
      {showContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">
                Contact {type.managerName || 'Manager'}
              </h3>
              <button
                onClick={() => {
                  setShowContact(false)
                  setContactResult(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question about this opportunity..."
              rows={5}
              maxLength={2000}
              className="input w-full"
            />
            {contactResult && <p className="text-sm mt-2 text-gray-600">{contactResult}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => setShowContact(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSend}
                loading={sending}
                disabled={!message.trim()}
              >
                Send Message
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Register — {type.name}</h3>
              <button
                onClick={() => {
                  setShowRegister(false)
                  setRegResult(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Planned delivery date *</label>
                <input
                  type="date"
                  className="input w-full"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Contact phone (optional)</label>
                <input
                  type="tel"
                  className="input w-full"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Anything we should know? (optional)</label>
                <textarea
                  className="input w-full"
                  rows={3}
                  maxLength={2000}
                  value={regMessage}
                  onChange={(e) => setRegMessage(e.target.value)}
                  placeholder="Group size, theme, questions..."
                />
              </div>
            </div>
            {regResult && <p className="text-sm mt-2 text-gray-600">{regResult}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => setShowRegister(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleRegister}
                loading={registering}
                disabled={!regDate}
              >
                Submit Registration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
