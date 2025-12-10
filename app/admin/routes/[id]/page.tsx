'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Calendar, MapPin, Edit, CheckCircle, Clock, Circle, Save, X, Trash2, Download, GripVertical, XCircle, Map } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Select } from '@/components/shared/Input'
import { Loading } from '@/components/shared/Loading'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { RouteMapView } from '@/components/admin/RouteMapView'

export default function RouteDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [route, setRoute] = useState<any>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [isReordering, setIsReordering] = useState(false)
  const [showMapView, setShowMapView] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchRoute = async () => {
    try {
      setLoading(true)
      setError(null)

      const [routeRes, driversRes] = await Promise.all([
        fetch(`/api/routes/${id}`),
        fetch('/api/drivers'),
      ])

      const routeData = await routeRes.json()
      const driversData = await driversRes.json()

      if (!routeRes.ok) {
        throw new Error(routeData.message || 'Failed to fetch route')
      }

      setRoute(routeData.data)
      setDrivers(driversData.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load route')
      console.error('Error fetching route:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoute()
  }, [id])

  const handleUpdateDriver = async (newDriverId: string) => {
    try {
      setUpdating(true)

      const response = await fetch(`/api/routes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: newDriverId ? parseInt(newDriverId) : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update driver')
      }

      setRoute(data.data)
    } catch (err) {
      console.error('Error updating driver:', err)
      alert('Failed to update driver')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success-600" />
      case 'skipped':
        return <XCircle className="w-5 h-5 text-warning-600" />
      case 'active':
        return <Clock className="w-5 h-5 text-primary-600" />
      default: // pending
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-success-100 text-success-700 border-success-200',
      active: 'bg-primary-100 text-primary-700 border-primary-200',
      pending: 'bg-gray-100 text-gray-700 border-gray-200',
    }

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const handleEditAddress = (address: any) => {
    setEditingAddressId(address.id)
    setEditForm({
      streetAddress: address.streetAddress,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      specialInstructions: address.specialInstructions || '',
    })
  }

  const handleCancelEdit = () => {
    setEditingAddressId(null)
    setEditForm({})
  }

  const handleSaveAddress = async (addressId: number) => {
    try {
      setUpdating(true)

      const response = await fetch(`/api/addresses/${addressId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update address')
      }

      // Update local state
      const updatedRoute = {
        ...route,
        addresses: route.addresses.map((addr: any) =>
          addr.id === addressId ? { ...addr, ...editForm } : addr
        ),
      }
      setRoute(updatedRoute)
      setEditingAddressId(null)
      setEditForm({})
    } catch (err) {
      console.error('Error updating address:', err)
      alert('Failed to update address')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteRoute = async () => {
    if (!confirm(`Are you sure you want to delete route "${route.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setUpdating(true)

      const response = await fetch(`/api/routes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete route')
      }

      alert('Route deleted successfully')
      router.push('/admin/routes')
    } catch (err) {
      console.error('Error deleting route:', err)
      alert('Failed to delete route')
      setUpdating(false)
    }
  }

  const handleExportToCSV = async () => {
    try {
      const response = await fetch(`/api/routes/${id}/export`)

      if (!response.ok) {
        throw new Error('Failed to export route')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${route.name}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error exporting route:', err)
      alert('Failed to export route to CSV')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = route.addresses.findIndex((addr: any) => addr.id === active.id)
    const newIndex = route.addresses.findIndex((addr: any) => addr.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistically update UI
    const reorderedAddresses = arrayMove(route.addresses, oldIndex, newIndex)
    setRoute({ ...route, addresses: reorderedAddresses })

    // Save to server
    setIsReordering(true)
    try {
      const addressIds = reorderedAddresses.map((addr: any) => addr.id)
      const response = await fetch(`/api/routes/${id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to reorder addresses')
      }

      const data = await response.json()
      setRoute({ ...route, addresses: data.route.addresses })
    } catch (err) {
      console.error('Error reordering addresses:', err)
      alert('Failed to reorder addresses. Please refresh the page.')
      // Revert on error
      fetchRoute()
    } finally {
      setIsReordering(false)
    }
  }

  if (loading) {
    return <Loading fullScreen text="Loading route details..." />
  }

  if (error || !route) {
    return (
      <div className="space-y-4">
        <Link href="/admin/routes">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4" />
            Back to Routes
          </Button>
        </Link>
        <ErrorMessage
          title="Error Loading Route"
          message={error || 'Route not found'}
        />
      </div>
    )
  }

  const completedStops = route.addresses.filter((a: any) => a.status === 'completed').length
  const totalStops = route.addresses.length
  const percentComplete = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/routes">
          <Button variant="secondary" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Routes
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{route.name}</h1>
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(route.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              {getStatusBadge(route.status)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowMapView(true)}
            >
              <Map className="w-4 h-4" />
              View Map
            </Button>
            {route.status === 'completed' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportToCSV}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDeleteRoute}
              disabled={updating}
              className="text-danger-600 hover:bg-danger-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete Route
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600 mb-1">Progress</p>
            <p className="text-3xl font-bold text-gray-900">{percentComplete}%</p>
            <div className="mt-3 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-success-500 transition-all"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {completedStops} of {totalStops} stops completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600 mb-1">Driver</p>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-gray-400" />
              <p className="text-lg font-semibold text-gray-900">
                {route.driver?.name || 'Unassigned'}
              </p>
            </div>
            {route.driver && (
              <p className="text-sm text-gray-500">{route.driver.email}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600 mb-3">Reassign Driver</p>
            <Select
              value={route.driverId?.toString() || ''}
              onChange={(e) => handleUpdateDriver(e.target.value)}
              options={[
                { value: '', label: 'Unassigned' },
                ...drivers.map((d) => ({
                  value: d.id.toString(),
                  label: d.name,
                })),
              ]}
              disabled={updating}
            />
          </CardContent>
        </Card>
      </div>

      {/* Addresses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Addresses ({totalStops} stops)</CardTitle>
            {isReordering && (
              <span className="text-sm text-gray-500">Saving order...</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={route.addresses.map((addr: any) => addr.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {route.addresses.map((address: any) => (
                  <SortableAddressCard
                    key={address.id}
                    address={address}
                    editingAddressId={editingAddressId}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    handleEditAddress={handleEditAddress}
                    handleCancelEdit={handleCancelEdit}
                    handleSaveAddress={handleSaveAddress}
                    updating={updating}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* Route Map View Modal */}
      <RouteMapView
        isOpen={showMapView}
        onClose={() => setShowMapView(false)}
        route={route}
        onReorder={async (addressIds: number[]) => {
          setIsReordering(true)
          try {
            const response = await fetch(`/api/routes/${id}/reorder`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ addressIds }),
            })

            if (!response.ok) {
              throw new Error('Failed to reorder addresses')
            }

            const data = await response.json()
            setRoute({ ...route, addresses: data.route.addresses })
          } catch (err) {
            console.error('Error reordering addresses:', err)
            throw err
          } finally {
            setIsReordering(false)
          }
        }}
      />
    </div>
  )
}

// Separate component for sortable address card
interface SortableAddressCardProps {
  address: any
  editingAddressId: number | null
  editForm: any
  setEditForm: (form: any) => void
  handleEditAddress: (address: any) => void
  handleCancelEdit: () => void
  handleSaveAddress: (addressId: number) => void
  updating: boolean
  getStatusIcon: (status: string) => JSX.Element
}

function SortableAddressCard({
  address,
  editingAddressId,
  editForm,
  setEditForm,
  handleEditAddress,
  handleCancelEdit,
  handleSaveAddress,
  updating,
  getStatusIcon,
}: SortableAddressCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: address.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-lg border ${
        editingAddressId === address.id
          ? 'bg-primary-50 border-primary-200'
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      } transition-colors`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            address.status === 'completed'
              ? 'bg-success-100 text-success-700'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {address.sequenceOrder}
          </div>
        </div>

        <div className="flex-1">
          {editingAddressId === address.id ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={editForm.streetAddress}
                  onChange={(e) => setEditForm({ ...editForm, streetAddress: e.target.value })}
                  className="input text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={editForm.zipCode}
                    onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                    className="input text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Special Instructions
                </label>
                <textarea
                  value={editForm.specialInstructions}
                  onChange={(e) => setEditForm({ ...editForm, specialInstructions: e.target.value })}
                  className="input text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSaveAddress(address.id)}
                  disabled={updating}
                >
                  <Save className="w-4 h-4" />
                  Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={updating}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="font-medium text-gray-900">{address.streetAddress}</p>
              <p className="text-sm text-gray-600">
                {address.city}, {address.state} {address.zipCode}
              </p>
              {address.specialInstructions && (
                <p className="text-sm text-primary-600 mt-1">
                  ℹ️ {address.specialInstructions}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {editingAddressId !== address.id && (
            <>
              <button
                onClick={() => handleEditAddress(address)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Edit address"
              >
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
              <div
                {...attributes}
                {...listeners}
                className="p-2 cursor-grab hover:bg-gray-200 rounded-lg transition-colors active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
            </>
          )}
          <div title={`Status: ${address.status}`}>
            {getStatusIcon(address.status)}
          </div>
        </div>
      </div>
    </div>
  )
}
