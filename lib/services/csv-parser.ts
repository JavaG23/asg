import { parse } from 'csv-parse/sync'
import prisma from '@/lib/database/client'
import { geocodeAddress } from './geocoding'
import type { CSVRow, ImportResult, ImportError } from '@/types'

// Helper function to get value from CSV row with flexible column names
function getColumnValue(row: CSVRow, ...possibleNames: string[]): string | undefined {
  for (const name of possibleNames) {
    // Check exact match and with trailing space (common CSV export issue)
    if (row[name] !== undefined) return row[name]
    if (row[name + ' '] !== undefined) return row[name + ' ']
  }
  return undefined
}

export async function parseAndImportCSV(csvContent: string, eventDate?: Date): Promise<ImportResult> {
  const errors: ImportError[] = []
  const routes: any[] = []
  let routesWithDrivers = 0
  let routesWithoutDrivers = 0

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

    // Detect if CSV has driver information
    const firstRow = records[0]
    const hasDriverColumn = !!(
      getColumnValue(firstRow, 'driver_email', 'Driver Email', 'email') ||
      getColumnValue(firstRow, 'driver_name', 'Driver Name', 'Driver')
    )
    console.log(`CSV driver detection: ${hasDriverColumn ? 'Driver columns found' : 'No driver columns - routes will need manual assignment'}`)

    // Group addresses by route
    const routeMap = new Map<string, CSVRow[]>()

    records.forEach((row, index) => {
      const rowNum = index + 2 // +2 for header row and 0-indexing

      // Get route name with flexible column names
      const routeName = getColumnValue(row, 'route_name', 'Route #', 'Route', 'route')
      if (!routeName) {
        errors.push({ row: rowNum, field: 'route_name', message: 'Route name/number is required' })
        return
      }

      // Get street address with flexible column names
      const streetAddress = getColumnValue(row, 'street_address', 'pickup_addess_firstline', 'Address', 'Street')
      if (!streetAddress) {
        errors.push({ row: rowNum, field: 'street_address', message: 'Street address is required' })
        return
      }

      // Normalize the route name for grouping
      const normalizedRouteName = routeName.startsWith('Route') ? routeName : `Route ${routeName}`

      if (!routeMap.has(normalizedRouteName)) {
        routeMap.set(normalizedRouteName, [])
      }
      routeMap.get(normalizedRouteName)!.push(row)
    })

    // If there are validation errors that prevent any rows from being processed, return early
    if (errors.length > 0 && routeMap.size === 0) {
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
        // Get driver info if available
        const driverEmail = getColumnValue(addresses[0], 'driver_email', 'Driver Email', 'email')
        const driverName = getColumnValue(addresses[0], 'driver_name', 'Driver Name', 'Driver')

        let driverId: number | null = null

        if (driverEmail) {
          // Check if driver exists
          const existingDriver = await prisma.user.findUnique({
            where: { email: driverEmail.toLowerCase() }
          })

          if (existingDriver) {
            driverId = existingDriver.id
            console.log(`  ✓ Found driver: ${existingDriver.name} (${driverEmail})`)
          } else {
            // Driver email provided but not in system - add warning
            errors.push({
              row: 0,
              field: 'driver_email',
              message: `Driver not found for route ${routeName}: ${driverEmail}. Import drivers first using the Volunteer List CSV.`,
            })
            console.warn(`  ⚠ Driver not found: ${driverEmail} - route will be created without driver`)
          }
        }

        // Geocode addresses (with caching to avoid redundant API calls)
        console.log(`Geocoding ${addresses.length} addresses for route: ${routeName}...`)
        const geocodedAddresses = []

        for (let index = 0; index < addresses.length; index++) {
          const addr = addresses[index]
          let coords: { latitude: number; longitude: number } | null = null

          // Get address fields with flexible column names
          const streetAddress = getColumnValue(addr, 'street_address', 'pickup_addess_firstline', 'Address', 'Street') || ''
          const city = getColumnValue(addr, 'city', 'pickup_city', 'City') || ''
          const state = getColumnValue(addr, 'state', 'Pickup_state', 'State') || ''
          const zipCode = getColumnValue(addr, 'zip_code', 'pickup_zip', 'Zip', 'ZIP') || ''
          const sequenceOrder = getColumnValue(addr, 'sequence_order', 'Stop #', 'Stop', 'Sequence') || '0'
          const specialInstructions = getColumnValue(addr, 'special_instructions', 'Pickup_notes', 'Notes', 'Instructions') || null

          // Check if this address has already been geocoded in the database
          const existingAddress = await prisma.address.findFirst({
            where: {
              streetAddress: streetAddress,
              city: city,
              state: state,
              zipCode: zipCode,
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
            console.log(`  ✓ Cached: ${streetAddress} -> ${coords.latitude}, ${coords.longitude}`)
          } else {
            // Add delay between geocoding requests (100ms = max 10 requests/second)
            if (index > 0 && geocodedAddresses.filter(a => !a.cached).length > 0) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }

            // Geocode new address
            coords = await geocodeAddress(streetAddress, city, state, zipCode)

            if (coords) {
              console.log(`  ✓ Geocoded: ${streetAddress} -> ${coords.latitude}, ${coords.longitude}`)
            } else {
              console.warn(`  ⚠ Failed to geocode: ${streetAddress}`)
            }
          }

          geocodedAddresses.push({
            sequenceOrder: parseInt(sequenceOrder) || index + 1,
            streetAddress: streetAddress,
            city: city,
            state: state,
            zipCode: zipCode,
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null,
            specialInstructions: specialInstructions,
            status: 'pending',
            cached: existingAddress !== null,
          })
        }

        // Create route with geocoded addresses (remove 'cached' flag before saving)
        const addressesToCreate = geocodedAddresses.map(({ cached, ...addr }) => addr)

        const route = await prisma.route.create({
          data: {
            name: routeName,
            driverId: driverId,
            date: eventDate || new Date(),
            status: 'pending',
            addresses: {
              create: addressesToCreate,
            },
          },
          include: {
            addresses: true,
          },
        })

        // Track driver assignment stats
        if (driverId) {
          routesWithDrivers++
        } else {
          routesWithoutDrivers++
        }

        const geocodedCount = geocodedAddresses.filter(a => a.latitude && a.longitude).length
        const cachedCount = geocodedAddresses.filter(a => a.cached).length
        const freshCount = geocodedCount - cachedCount
        const driverStatus = driverId ? 'with driver' : 'NO DRIVER ASSIGNED'
        console.log(`✅ Created route ${routeName} (${driverStatus}) with ${geocodedCount}/${addresses.length} geocoded addresses (${cachedCount} cached, ${freshCount} fresh)`)

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

    console.log(`\n📊 Import Summary: ${routes.length} routes created`)
    console.log(`   - With drivers: ${routesWithDrivers}`)
    console.log(`   - Without drivers (need assignment): ${routesWithoutDrivers}`)

    return {
      success: errors.length === 0 || routes.length > 0,
      imported: routes.length,
      routes,
      errors,
      routesWithDrivers,
      routesWithoutDrivers,
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

// Driver CSV Row interface for VolunteerList.csv format
interface DriverCSVRow {
  'Route '?: string      // Note: has trailing space in actual CSV
  'Route'?: string
  'First Name'?: string
  'Last Name'?: string
  'Volunteer Email'?: string
  'Mobile Phone Number'?: string
  'Shift Drop Off Time'?: string
  'Scheduled Roles'?: string
}

export interface DriverImportResult {
  success: boolean
  imported: number
  updated: number
  drivers: any[]
  errors: ImportError[]
  driversWithPassword: number
  driversWithoutPassword: number
}

export async function parseAndImportDriversCSV(csvContent: string): Promise<DriverImportResult> {
  const errors: ImportError[] = []
  const drivers: any[] = []
  let importedCount = 0
  let updatedCount = 0

  try {
    // Parse CSV
    const records: DriverCSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    if (records.length === 0) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        drivers: [],
        errors: [{ row: 0, field: 'file', message: 'CSV file is empty' }],
        driversWithPassword: 0,
        driversWithoutPassword: 0,
      }
    }

    // Process each driver row
    for (let index = 0; index < records.length; index++) {
      const row = records[index]
      const rowNum = index + 2 // +2 for header row and 0-indexing

      // Handle column name variations (with or without trailing space)
      const routeNum = row['Route '] || row['Route']
      const firstName = row['First Name']
      const lastName = row['Last Name']
      const email = row['Volunteer Email']
      const phone = row['Mobile Phone Number']
      const dropOffTime = row['Shift Drop Off Time']

      // Validate required fields
      if (!firstName || !lastName) {
        errors.push({ row: rowNum, field: 'name', message: 'First and Last name are required' })
        continue
      }
      if (!email) {
        errors.push({ row: rowNum, field: 'email', message: 'Volunteer email is required' })
        continue
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: rowNum, field: 'email', message: `Invalid email format: ${email}` })
        continue
      }

      try {
        const fullName = `${firstName} ${lastName}`.trim()

        // Check if driver exists
        const existingDriver = await prisma.user.findUnique({
          where: { email: email.toLowerCase() }
        })

        let driver
        if (existingDriver) {
          // Update existing driver
          driver = await prisma.user.update({
            where: { email: email.toLowerCase() },
            data: {
              name: fullName,
              phone: phone || existingDriver.phone,
            }
          })
          updatedCount++
          console.log(`  ↻ Updated driver: ${fullName} (${email})`)
        } else {
          // Create new driver
          driver = await prisma.user.create({
            data: {
              name: fullName,
              email: email.toLowerCase(),
              phone: phone || null,
              role: 'driver',
              active: true,
            }
          })
          importedCount++
          console.log(`  ✓ Created driver: ${fullName} (${email})`)
        }

        // If route number provided, try to assign driver to route
        if (routeNum) {
          const routeName = `Route ${routeNum}`
          const route = await prisma.route.findFirst({
            where: {
              name: routeName,
              driverId: null, // Only assign if route has no driver
            }
          })

          if (route) {
            await prisma.route.update({
              where: { id: route.id },
              data: { driverId: driver.id }
            })
            console.log(`    → Assigned to ${routeName}`)
          }
        }

        drivers.push({
          id: driver.id,
          name: driver.name,
          email: driver.email,
          phone: driver.phone,
          routeNumber: routeNum || null,
          isNew: !existingDriver,
          // hasPassword will always be false until migration is run
          // TODO: After migration, uncomment passwordHash in schema and use: !!driver.passwordHash
          hasPassword: false,
        })
      } catch (error) {
        console.error(`Error importing driver at row ${rowNum}:`, error)
        errors.push({
          row: rowNum,
          field: 'driver',
          message: `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }

    const driversWithPassword = drivers.filter(d => d.hasPassword).length
    const driversWithoutPassword = drivers.filter(d => !d.hasPassword).length

    console.log(`✅ Driver import complete: ${importedCount} new, ${updatedCount} updated, ${errors.length} errors`)
    console.log(`   Password status: ${driversWithPassword} with password, ${driversWithoutPassword} need password setup`)

    return {
      success: errors.length === 0,
      imported: importedCount,
      updated: updatedCount,
      drivers,
      errors,
      driversWithPassword,
      driversWithoutPassword,
    }
  } catch (error) {
    console.error('Driver CSV parsing error:', error)
    return {
      success: false,
      imported: 0,
      updated: 0,
      drivers: [],
      errors: [
        {
          row: 0,
          field: 'file',
          message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      driversWithPassword: 0,
      driversWithoutPassword: 0,
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

      // Required fields validation (using flexible column names)
      const routeName = getColumnValue(row, 'route_name', 'Route #', 'Route', 'route')
      if (!routeName) {
        errors.push({ row: rowNum, field: 'route_name', message: 'Route name/number is required' })
      }

      const streetAddress = getColumnValue(row, 'street_address', 'pickup_addess_firstline', 'Address', 'Street')
      if (!streetAddress) {
        errors.push({ row: rowNum, field: 'street_address', message: 'Street address is required' })
      }

      // Optional but validated if present
      const driverEmail = getColumnValue(row, 'driver_email', 'Driver Email', 'email')
      if (driverEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverEmail)) {
        errors.push({ row: rowNum, field: 'driver_email', message: 'Invalid email format' })
      }

      const sequenceOrder = getColumnValue(row, 'sequence_order', 'Stop #', 'Stop', 'Sequence')
      if (sequenceOrder && isNaN(parseInt(sequenceOrder))) {
        errors.push({ row: rowNum, field: 'sequence_order', message: 'Stop number must be a number' })
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
