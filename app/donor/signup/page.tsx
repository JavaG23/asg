'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, ArrowLeft, MapPin, User, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'

interface FormData {
  name: string
  email: string
  phone: string
  streetAddress: string
  city: string
  state: string
  zipCode: string
  notes: string
}

export default function DonorSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/donor/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      router.push('/donor/signup/pending')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500" />
              <h1 className="text-xl font-bold text-gray-900">Become a Donor</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-xl mx-auto">
        <div className="card">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Join A Simple Gesture
            </h2>
            <p className="text-gray-600">
              Sign up to become a food donor and help fight hunger in our community.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                Personal Information
              </h3>
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="John Doe"
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john@example.com"
                  required
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Pickup Address */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                Pickup Address
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                This is where our volunteers will pick up your food donations.
              </p>
              <div className="space-y-4">
                <Input
                  label="Street Address"
                  value={form.streetAddress}
                  onChange={(e) => handleChange('streetAddress', e.target.value)}
                  placeholder="123 Main Street"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City"
                    required
                  />
                  <Input
                    label="State"
                    value={form.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="NC"
                    required
                  />
                </div>
                <Input
                  label="ZIP Code"
                  value={form.zipCode}
                  onChange={(e) => handleChange('zipCode', e.target.value)}
                  placeholder="27601"
                  required
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Any special instructions for pickup (e.g., gate code, best time for pickup, etc.)"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Terms */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p>
                By submitting this application, you agree to participate in the A Simple Gesture
                food donation program. Your application will be reviewed by our team and you'll
                receive an email once approved.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full py-3 bg-red-500 hover:bg-red-600"
            >
              <Heart className="w-5 h-5" />
              Submit Application
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-red-600 hover:text-red-700 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
