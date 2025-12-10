import { parse } from 'csv-parse/sync'
import prisma from '@/lib/database/client'
import { geocodeAddress } from './geocoding'
import type { CSVRow, ImportResult, ImportError } from '@/types'

export async function parseAndImportCSV(csvContent: string): Promise<ImportResult> {
  const errors: ImportError[] = []
  const routes: any[] = []

  try {
    // Parse CSV
    const records: CSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    if (records.length === 0) {
      return {
        success: false,
        imported: 0,
        routes: [],
        errors: [{ row: 0, field: 'file', message: 'CSV file is empty' }],
      }
    }

    // Group addresses by route
    const routeMap = new Map<string, CSVRow[]>()

    records.forEach((row, index) => {
      // Validate required fields
      if (!row.route_name) {
        errors.push({ row: index + 2, field: 'route_name', message: 'Route name is required' })
        return
      }
      if (!row.driver_name) {
        errors.push({ row: index + 2, field: 'driver_name', message: 'Driver name is required' })
        return
      }
      if (!row.driver_email) {
        errors.push({ row: index + 2, field: 'driver_email', message: 'Driver email is required' })
        return
      }
      if (!row.street_address) {
        errors.push({ row: index + 2, field: 'street_address', message: 'Street address is required' })
        return
      }

      if (!routeMap.has(row.route_name)) {
        routeMap.set(row.route_name, [])
      }
      routeMap.get(row.route_name)!.push(row)
    })

    // If there are validation errors, return early
    if (errors.length > 0) {
      return {
        success: false,
        imported: 0,
        routes: [],
        errors,
      }
    }

    // Import each route
    for (const [routeName, addresses] of routeMap.entries()) {
      try {
        const driverEmail = addresses[0].driver_email
        const driverName = addresses[0].driver_name

        // Find or create driver
        const driver = await prisma.user.upsert({
          where: { email: driverEmail },
          update: {},
          create: {
            name: driverName,
            email: driverEmail,
            role: 'driver',
            active: true,
          },
        })

        // Geocode addresses (with caching to avoid redundant API calls)
        console.log(`Geocoding ${addresses.length} addresses for route: ${routeName}...`)
        const geocodedAddresses = []

        for (let index = 0; index < addresses.length; index++) {
          const addr = addresses[index]
          let coords: { latitude: number; longitude: number } | null = null

          // Check if this address has already been geocoded in the database
          // SQLite is case-insensitive by default, so no need for mode: 'insensitive'
          const existingAddress = await prisma.address.findFirst({
            where: {
              streetAddress: addr.street_address,
              city: addr.city || '',
              state: addr.state || '',
              zipCode: addr.zip_code || '',
              latitude: { not: null },
              longitude: { not: null },
            },
            select: {
              latitude: true,
              longitude: true,
            },
          })

          if (existingAddress && existingAddress.latitude && existingAddress.longitude) {
            // Reuse cached coordinates
            coords = {
              latitude: existingAddress.latitude,
              longitude: existingAddress.longitude,
            }
            console.log(`  ✓ Cached: ${addr.street_address} -> ${coords.latitude}, ${coords.longitude}`)
          } else {
            // Add delay between geocoding requests (100ms = max 10 requests/second)
            if (index > 0 && geocodedAddresses.filter(a => !a.cached).length > 0) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }

            // Geocode new address
            coords = await geocodeAddress(
              addr.street_address,
              addr.city || '',
              addr.state || '',
              addr.zip_code || ''
            )

            if (coords) {
              console.log(`  ✓ Geocoded: ${addr.street_address} -> ${coords.latitude}, ${coords.longitude}`)
            } else {
              console.warn(`  ⚠ Failed to geocode: ${addr.street_address}`)
            }
          }

          geocodedAddresses.push({
            sequenceOrder: parseInt(addr.sequence_order) || 0,
            streetAddress: addr.street_address,
            city: addr.city,
            state: addr.state,
            zipCode: addr.zip_code,
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null,
            specialInstructions: addr.special_instructions || null,
            status: 'pending',
            cached: existingAddress !== null,
          })
        }

        // Create route with geocoded addresses (remove 'cached' flag before saving)
        const addressesToCreate = geocodedAddresses.map(({ cached, ...addr }) => addr)

        const route = await prisma.route.create({
          data: {
            name: routeName,
            driverId: driver.id,
            date: new Date(),
            status: 'pending',
            addresses: {
              create: addressesToCreate,
            },
          },
          include: {
            addresses: true,
          },
        })

        const geocodedCount = geocodedAddresses.filter(a => a.latitude && a.longitude).length
        const cachedCount = geocodedAddresses.filter(a => a.cached).length
        const freshCount = geocodedCount - cachedCount
        console.log(`✅ Created route ${routeName} with ${geocodedCount}/${addresses.length} geocoded addresses (${cachedCount} cached, ${freshCount} fresh)`)

        routes.push(route)
      } catch (error) {
        console.error(`Error importing route ${routeName}:`, error)
        errors.push({
          row: 0,
          field: 'route',
          message: `Failed to import route ${routeName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }

    return {
      success: errors.length === 0,
      imported: routes.length,
      routes,
      errors,
    }
  } catch (error) {
    console.error('CSV parsing error:', error)
    return {
      success: false,
      imported: 0,
      routes: [],
      errors: [
        {
          row: 0,
          field: 'file',
          message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    }
  }
}

export async function validateCSV(csvContent: string): Promise<ImportError[]> {
  const errors: ImportError[] = []

  try {
    const records: CSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    records.forEach((row, index) => {
      const rowNum = index + 2 // +2 because index starts at 0 and we have header row

      // Required fields validation
      if (!row.route_name) {
        errors.push({ row: rowNum, field: 'route_name', message: 'Required field missing' })
      }
      if (!row.driver_name) {
        errors.push({ row: rowNum, field: 'driver_name', message: 'Required field missing' })
      }
      if (!row.driver_email) {
        errors.push({ row: rowNum, field: 'driver_email', message: 'Required field missing' })
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.driver_email)) {
        errors.push({ row: rowNum, field: 'driver_email', message: 'Invalid email format' })
      }
      if (!row.sequence_order) {
        errors.push({ row: rowNum, field: 'sequence_order', message: 'Required field missing' })
      } else if (isNaN(parseInt(row.sequence_order))) {
        errors.push({ row: rowNum, field: 'sequence_order', message: 'Must be a number' })
      }
      if (!row.street_address) {
        errors.push({ row: rowNum, field: 'street_address', message: 'Required field missing' })
      }
      if (!row.city) {
        errors.push({ row: rowNum, field: 'city', message: 'Required field missing' })
      }
      if (!row.state) {
        errors.push({ row: rowNum, field: 'state', message: 'Required field missing' })
      }
      if (!row.zip_code) {
        errors.push({ row: rowNum, field: 'zip_code', message: 'Required field missing' })
      }
    })
  } catch (error) {
    errors.push({
      row: 0,
      field: 'file',
      message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  return errors
}
