'use client'

import { useState, useMemo } from 'react'
import { GoogleMap, MapMarker } from '@/components/maps/GoogleMap'
import { Modal } from '@/components/shared/Modal'
import { Button } from '@/components/shared/Button'
import { X, AlertCircle, Save, Info, GripVertical } from 'lucide-react'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface RouteMapViewProps {
  isOpen: boolean
  onClose: () => void
  route: {
    id: number
    name: string
    addresses: Array<{
      id: number
      sequenceOrder: number
      streetAddress: string
      city: string
      state: string
      zipCode: string
      latitude?: number
      longitude?: number
      status: string
    }>
  }
  onReorder?: (addressIds: number[]) => Promise<void>
}

// Sortable Address Item Component
function SortableAddressItem({
  address,
  index,
  isSelected,
  onSelect,
}: {
  address: RouteMapViewProps['route']['addresses'][0]
  index: number
  isSelected: boolean
  onSelect: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: address.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(address.id)}
      className={`flex items-start gap-3 p-2 rounded cursor-move transition-all ${
        isSelected
          ? 'bg-primary-100 border-2 border-primary-500 shadow-md'
          : address.latitude && address.longitude
          ? 'bg-white border border-gray-200 hover:border-primary-300'
          : 'bg-yellow-50 border border-yellow-200 hover:border-yellow-400'
      }`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
      <div className={`flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${
        isSelected ? 'bg-primary-700' : 'bg-primary-600'
      }`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{address.streetAddress}</p>
        <p className="text-xs text-gray-600">
          {address.city}, {address.state} {address.zipCode}
        </p>
        {!address.latitude && (
          <p className="text-xs text-yellow-700 mt-1">⚠️ No GPS coordinates</p>
        )}
      </div>
      <div className="flex-shrink-0">
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            address.status === 'completed'
              ? 'bg-success-100 text-success-700'
              : address.status === 'skipped'
              ? 'bg-warning-100 text-warning-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {address.status}
        </span>
      </div>
    </div>
  )
}

export function RouteMapView({ isOpen, onClose, route, onReorder }: RouteMapViewProps) {
  const [addresses, setAddresses] = useState(route.addresses)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)

  // Filter addresses that have coordinates
  const geocodedAddresses = addresses.filter(
    (addr) => addr.latitude !== null && addr.latitude !== undefined &&
              addr.longitude !== null && addr.longitude !== undefined
  )

  const missingGeocodingCount = addresses.length - geocodedAddresses.length

  // Convert addresses to markers - useMemo to prevent re-calculation on every render
  const markers: MapMarker[] = useMemo(
    () =>
      geocodedAddresses.map((addr, index) => ({
        id: addr.id,
        lat: addr.latitude!,
        lng: addr.longitude!,
        label: `Stop ${index + 1}`,
        title: addr.streetAddress, // Show street address in tooltip on hover
        draggable: false, // Not draggable - use address list instead
      })),
    [geocodedAddresses]
  )

  // Calculate map center - useMemo to prevent re-calculation on every render
  const mapCenter = useMemo(
    () =>
      markers.length > 0
        ? {
            lat: markers.reduce((sum, m) => sum + m.lat, 0) / markers.length,
            lng: markers.reduce((sum, m) => sum + m.lng, 0) / markers.length,
          }
        : { lat: 38.9072, lng: -77.0369 }, // Default: Washington, DC
    [markers]
  )

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end - reorder addresses
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setAddresses((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const reordered = arrayMove(items, oldIndex, newIndex)

        // Update sequence order
        const updated = reordered.map((addr, index) => ({
          ...addr,
          sequenceOrder: index,
        }))

        setHasChanges(true)
        return updated
      })
    }
  }

  const handleSaveOrder = async () => {
    if (!onReorder) return

    setIsSaving(true)
    try {
      // Send ALL addresses in the current order, not just geocoded ones
      const addressIds = addresses.map((addr) => addr.id)

      await onReorder(addressIds)
      setHasChanges(false)
      onClose()
    } catch (error) {
      console.error('Error saving route order:', error)
      alert('Failed to save route order. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Route Map: ${route.name}`}
      size="xl"
    >
      <div className="flex flex-col h-[calc(100vh-200px)] md:max-h-[calc(100vh-200px)] md:overflow-y-auto">
        {/* Missing Geocoding Warning */}
        {missingGeocodingCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900 mb-1">
                  {missingGeocodingCount} address{missingGeocodingCount !== 1 ? 'es' : ''} not geocoded
                </p>
                <p className="text-xs text-yellow-700">
                  Some addresses are missing GPS coordinates and won't appear on the map.
                  Enable geocoding in your CSV import process to automatically add coordinates.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Map - 80% on mobile, fixed height on desktop */}
        <div className="rounded-lg overflow-hidden border border-gray-200 h-[80vh] md:h-96 flex-shrink-0">
          {markers.length > 0 ? (
            <GoogleMap
              center={mapCenter}
              zoom={12}
              markers={markers}
              onMarkerClick={(markerId) => setSelectedAddressId(markerId)}
              selectedMarkerId={selectedAddressId}
              showRoute={true}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="text-center p-6 max-w-md">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Geocoded Addresses
                </h3>
                <p className="text-sm text-gray-600">
                  None of the addresses in this route have GPS coordinates yet.
                  Please geocode the addresses to view them on the map.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Address List - Draggable on mobile, scrollable on desktop */}
        <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-[20vh] md:max-h-64 overflow-y-auto flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">
              Addresses in Route ({addresses.length})
            </h4>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <GripVertical className="w-3 h-3" />
              Drag to reorder
            </p>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={addresses.map(a => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {addresses.map((addr, index) => (
                  <SortableAddressItem
                    key={addr.id}
                    address={addr}
                    index={index}
                    isSelected={selectedAddressId === addr.id}
                    onSelect={setSelectedAddressId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {hasChanges ? 'Route order has been changed' : 'No unsaved changes'}
          </p>
          <div className="flex items-center gap-2">
            {hasChanges && onReorder && (
              <Button variant="primary" onClick={handleSaveOrder} disabled={isSaving}>
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Route Order'}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
