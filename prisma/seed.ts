import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

interface CSVRow {
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

// Helper function to generate realistic GPS coordinates in DC area
function generateDCCoordinates(index: number, total: number): { latitude: number; longitude: number } {
  // Base coordinates: Washington, DC
  const baseLat = 38.9072
  const baseLng = -77.0369

  // Create a spread pattern - routes typically cover 5-10 mile radius
  // Roughly 0.01 degrees = 0.7 miles
  const maxSpread = 0.15 // ~10 miles

  // Create a slight progression pattern so stops appear in a logical route order
  const angle = (index / total) * Math.PI * 2 // Circular pattern
  const distance = (index / total) * maxSpread // Gradually move outward

  // Add some randomness to make it more realistic
  const randomOffsetLat = (Math.random() - 0.5) * 0.02
  const randomOffsetLng = (Math.random() - 0.5) * 0.02

  const latitude = baseLat + (Math.cos(angle) * distance) + randomOffsetLat
  const longitude = baseLng + (Math.sin(angle) * distance) + randomOffsetLng

  // Round to 6 decimal places (roughly 4 inch precision)
  return {
    latitude: Math.round(latitude * 1000000) / 1000000,
    longitude: Math.round(longitude * 1000000) / 1000000,
  }
}

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fooddelivery.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@fooddelivery.com',
      role: 'admin',
      active: true,
    },
  })
  console.log('✅ Created admin user:', admin.email)

  // Read and parse CSV
  const csvPath = join(process.cwd(), 'dummy_routes.csv')
  const csvContent = readFileSync(csvPath, 'utf-8')

  const records: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`📄 Found ${records.length} addresses in CSV`)

  // Group by route
  const routeMap = new Map<string, CSVRow[]>()

  records.forEach((row) => {
    if (!routeMap.has(row.route_name)) {
      routeMap.set(row.route_name, [])
    }
    routeMap.get(row.route_name)!.push(row)
  })

  console.log(`📦 Grouped into ${routeMap.size} routes`)

  // Import each route
  let routeCount = 0
  let addressCount = 0

  for (const [routeName, addresses] of routeMap.entries()) {
    const driverEmail = addresses[0].driver_email
    const driverName = addresses[0].driver_name

    // Create or find driver
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

    // Create route with addresses
    const route = await prisma.route.create({
      data: {
        name: routeName,
        driverId: driver.id,
        date: new Date(),
        status: 'pending',
        addresses: {
          create: addresses.map((addr, index) => {
            const coords = generateDCCoordinates(index, addresses.length)
            return {
              sequenceOrder: parseInt(addr.sequence_order),
              streetAddress: addr.street_address,
              city: addr.city,
              state: addr.state,
              zipCode: addr.zip_code,
              latitude: coords.latitude,
              longitude: coords.longitude,
              specialInstructions: addr.special_instructions || null,
              status: 'pending',
            }
          }),
        },
      },
      include: {
        addresses: true,
      },
    })

    routeCount++
    addressCount += route.addresses.length
    console.log(`✅ Created route: ${routeName} (${route.addresses.length} addresses)`)
  }

  console.log('')
  console.log('🎉 Seed completed successfully!')
  console.log(`   - 1 admin user`)
  console.log(`   - ${routeMap.size} drivers`)
  console.log(`   - ${routeCount} routes`)
  console.log(`   - ${addressCount} addresses`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
