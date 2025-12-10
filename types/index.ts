import { User, Route, Address, DeliveryLog } from '@prisma/client'

// Export Prisma types
export type { User, Route, Address, DeliveryLog }

// Extended types with relations
export type RouteWithAddresses = Route & {
  addresses: Address[]
  driver?: User | null
}

export type AddressWithLogs = Address & {
  deliveryLogs: DeliveryLog[]
}

export type RouteWithDetails = Route & {
  addresses: AddressWithLogs[]
  driver?: User | null
}

// CSV Import types
export interface CSVRow {
  route_name: string
  driver_name: string
  driver_email: string
  sequence_order: string
  street_address: string
  city: string
  state: string
  zip_code: string
  special_instructions?: string
}

export interface ImportResult {
  success: boolean
  imported: number
  routes: Route[]
  errors: ImportError[]
}

export interface ImportError {
  row: number
  field: string
  message: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Driver dashboard types
export interface RouteProgress {
  routeId: number
  totalStops: number
  completedStops: number
  currentStop: number
  percentComplete: number
}

// Map types
export interface LatLng {
  lat: number
  lng: number
}

export interface GeocodedAddress {
  latitude: number
  longitude: number
  formatted: string
}

// Status types
export type RouteStatus = 'pending' | 'active' | 'completed'
export type AddressStatus = 'pending' | 'completed' | 'skipped'
export type UserRole = 'driver' | 'admin'
