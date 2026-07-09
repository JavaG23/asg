'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ClipboardList, Clock, Mail, Phone, X } from 'lucide-react'
import { Button } from '@/components/shared/Button'

// Volunteer portal build-out (#65 / 65j)
// Bloomerang-style opportunity card. Primary CTA depends on the type's kind:
//   shifts / routes  -> View Opportunities (calendar filtered to this type)
//   self-reported    -> Log Hours (manual entry on the hours page)
//   registration     -> Register (planned delivery date + contact form)
// Contact Manager opens a send-message modal (email routed server-side).

export interface OpportunityTypeInfo {
  id: number
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  managerName: string | null
  managerPhone: string | null
  hasManager: boolean
  kind: 'shifts' | 'routes' | 'self-reported' | 'registration'
}

export function OpportunityCard({ type }: { type: OpportunityTypeInfo }) {
  const router = useRouter()
  const [showContact, setShowContact] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const [showRegister, setShowRegister] = useState(false)
  const [regDate, setRegDate] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regMessage, setRegMessage] = useState('')
  const [registering, setRegistering] = useState(false)
  const [regResult, setRegResult] = useState<string | null>(null)

  const handleSend = async () => {
    if (!message.trim()) return
    setSending(true)
    setSendResult(null)
    try {
      const response = await fetch('/api/volunteer/contact-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityTypeId: type.id, message }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send message')
      setSendResult('Message sent! The manager will reply to your email.')
      setMessage('')
    } catch (err) {
      setSendResult(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleRegister = async () => {
    if (!regDate) return
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

  const primaryAction = () => {
    switch (type.kind) {
      case 'self-reported':
        router.push(`/volunteer/hours?log=1&type=${type.id}`)
        break
      case 'registration':
        setShowRegister(true)
        break
      default:
        // shifts + routes both browse the calendar filtered to this type
        router.push(`/volunteer/opportunities?type=${type.id}`)
    }
  }

  const primaryLabel = () => {
    switch (type.kind) {
      case 'self-reported':
        return (
          <>
            <Clock className="w-4 h-4" />
            Log Hours
          </>
        )
      case 'registration':
        return (
          <>
            <ClipboardList className="w-4 h-4" />
            Register
          </>
        )
      default:
        return (
          <>
            <Calendar className="w-4 h-4" />
            View Opportunities
          </>
        )
    }
  }

  return (
    <div className="card overflow-hidden flex flex-col">
      {type.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={type.imageUrl}
          alt={type.name}
          className="w-full h-36 object-cover rounded-lg mb-3 -mt-1"
        />
      )}
      <h3 className="font-semibold text-gray-900 text-lg">{type.name}</h3>
      {type.description && (
        <p className="text-sm text-gray-600 mt-1 flex-1 whitespace-pre-line">{type.description}</p>
      )}

      <div className="flex gap-2 mt-4">
        <Button
          variant="primary"
          size="sm"
          className="bg-green-600 hover:bg-green-700 flex-1"
          onClick={primaryAction}
        >
          {primaryLabel()}
        </Button>
        {type.hasManager && (
          <Button variant="secondary" size="sm" onClick={() => setShowContact(true)}>
            <Mail className="w-4 h-4" />
            Contact Manager
          </Button>
        )}
      </div>

      {/* Contact Manager Modal */}
      {showContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">
                Contact {type.managerName || 'Manager'} — {type.name}
              </h3>
              <button
                onClick={() => {
                  setShowContact(false)
                  setSendResult(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {type.managerPhone && (
              <p className="text-sm text-gray-600 mb-3 flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                {type.managerPhone}
              </p>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question about this opportunity..."
              rows={5}
              maxLength={2000}
              className="input w-full"
            />
            {sendResult && <p className="text-sm mt-2 text-gray-600">{sendResult}</p>}
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

      {/* Registration Modal (kind='registration') */}
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
