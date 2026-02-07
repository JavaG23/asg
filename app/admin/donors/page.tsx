'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Heart,
  Mail,
  Phone,
  Search,
  Edit2,
  Plus,
  Calendar,
  MapPin,
  Link2,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Input, Select } from '@/components/shared/Input'
import { Button } from '@/components/shared/Button'
import { DonorEditModal } from '@/components/admin/DonorEditModal'

interface DonorData {
  id: number
  name: string
  email: string | null
  phone: string | null
  userId: number | null
  linkedUser?: {
    id: number
    name: string
    email: string
    active: boolean
  } | null
  createdAt?: string
  updatedAt?: string
  stats?: {
    totalDonations: number
    completedDonations: number
    uniqueEvents: number
  }
}

export default function DonorsPage() {
  const { data: session } = useSession()
  const [donors, setDonors] = useState<DonorData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('name')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState<DonorData | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchDonors = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/donors')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch donors')
      }

      setDonors(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load donors')
      console.error('Error fetching donors:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDonors()
  }, [])

  const handleEditDonor = async (donor: DonorData) => {
    // Fetch full donor details including addresses
    try {
      const response = await fetch(`/api/donors/${donor.id}`)
      const data = await response.json()
      if (response.ok) {
        setSelectedDonor({ ...donor, ...data.data })
        setEditModalOpen(true)
      }
    } catch (err) {
      console.error('Error fetching donor details:', err)
      setSelectedDonor(donor)
      setEditModalOpen(true)
    }
  }

  const handleSaveDonor = async (donorData: DonorData) => {
    const adminUserId = session?.user ? parseInt((session.user as any).id) : null

    const response = await fetch(`/api/donors/${donorData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...donorData, adminUserId }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update donor')
    }

    fetchDonors()
  }

  const handleAddDonor = async (donorData: { name: string; email: string; phone: string }) => {
    const response = await fetch('/api/donors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donorData),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create donor')
    }

    setShowAddModal(false)
    fetchDonors()
  }

  const formatDonorId = (id: number) => `DNR-${id.toString().padStart(5, '0')}`

  // Filter and sort donors
  const filteredDonors = donors
    .filter((donor) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        donor.name.toLowerCase().includes(query) ||
        donor.email?.toLowerCase().includes(query) ||
        donor.phone?.includes(query)
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'donations':
          return (b.stats?.totalDonations || 0) - (a.stats?.totalDonations || 0)
        case 'recent':
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        default:
          return 0
      }
    })

  if (loading) {
    return <Loading fullScreen text="Loading donors..." />
  }

  if (error) {
    return (
      <ErrorMessage
        title="Error Loading Donors"
        message={error}
        onDismiss={() => setError(null)}
      />
    )
  }

  const totalDonations = donors.reduce((sum, d) => sum + (d.stats?.totalDonations || 0), 0)
  const completedDonations = donors.reduce((sum, d) => sum + (d.stats?.completedDonations || 0), 0)
  const linkedDonors = donors.filter((d) => d.userId !== null).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donors</h1>
          <p className="text-gray-600 mt-1">Manage food donation sources</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Donor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Donors</p>
                <p className="text-3xl font-bold text-gray-900">{donors.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Donations</p>
                <p className="text-3xl font-bold text-gray-900">{totalDonations}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary-50">
                <MapPin className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{completedDonations}</p>
              </div>
              <div className="p-3 rounded-lg bg-success-50">
                <TrendingUp className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">With Accounts</p>
                <p className="text-3xl font-bold text-gray-900">{linkedDonors}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <Link2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search donors by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          label=""
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: 'name', label: 'Sort by Name' },
            { value: 'donations', label: 'Sort by Donations' },
            { value: 'recent', label: 'Sort by Recent' },
          ]}
          className="w-48"
        />
      </div>

      {/* Donors List */}
      <div className="grid gap-4">
        {filteredDonors.map((donor) => (
          <Card key={donor.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleEditDonor(donor)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {donor.name}
                        </h3>
                        <span className="px-2 py-0.5 text-xs font-mono bg-gray-200 text-gray-600 rounded">
                          {formatDonorId(donor.id)}
                        </span>
                        {donor.linkedUser && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                            <Link2 className="w-3 h-3" />
                            Linked Account
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {donor.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {donor.email}
                          </div>
                        )}
                        {donor.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {donor.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6 text-sm ml-15">
                    <div>
                      <p className="text-gray-600">Donations</p>
                      <p className="text-xl font-bold text-gray-900">
                        {donor.stats?.totalDonations || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Completed</p>
                      <p className="text-xl font-bold text-success-600">
                        {donor.stats?.completedDonations || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Events</p>
                      <p className="text-xl font-bold text-primary-600">
                        {donor.stats?.uniqueEvents || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleEditDonor(donor)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit donor"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredDonors.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No donors found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add donors when importing routes or click "Add Donor"'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      <DonorEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedDonor(null)
        }}
        donor={selectedDonor}
        onSave={handleSaveDonor}
      />

      {/* Add Donor Modal */}
      {showAddModal && (
        <AddDonorModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddDonor}
        />
      )}
    </div>
  )
}

// Simple Add Donor Modal
function AddDonorModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (data: { name: string; email: string; phone: string }) => Promise<void>
}) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSave(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create donor')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Donor</h2>

        {error && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Business or individual name"
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="contact@example.com"
          />

          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(555) 123-4567"
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" loading={loading} className="flex-1">
              Add Donor
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
