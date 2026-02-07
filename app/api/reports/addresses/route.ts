import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/reports/addresses
 * Get list of all unique addresses with delivery statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access reports
    if (!(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all addresses with delivery counts
    const addresses = await prisma.address.findMany({
      select: {
        id: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true,
        specialInstructions: true,
        _count: {
          select: {
            deliveryLogs: true,
          },
        },
      },
      orderBy: { streetAddress: 'asc' },
    })

    // Normalize address for comparison (lowercase, trim, standardize common abbreviations)
    const normalizeAddress = (street: string, city: string, state: string, zip: string) => {
      const normalizedStreet = street.toLowerCase().trim()
        .replace(/\bstreet\b/g, 'st')
        .replace(/\bavenue\b/g, 'ave')
        .replace(/\bdrive\b/g, 'dr')
        .replace(/\broad\b/g, 'rd')
        .replace(/\blane\b/g, 'ln')
        .replace(/\bcourt\b/g, 'ct')
        .replace(/\bplace\b/g, 'pl')
        .replace(/\bboulevard\b/g, 'blvd')
        .replace(/\bapartment\b/g, 'apt')
        .replace(/\bsuite\b/g, 'ste')
        .replace(/[.,#]/g, '')
        .replace(/\s+/g, ' ')
      return `${normalizedStreet}|${city.toLowerCase().trim()}|${state.toLowerCase().trim()}|${zip.trim()}`
    }

    // Group addresses by normalized key and aggregate stats
    const addressMap = new Map<string, {
      id: number // Use first encountered ID as representative
      streetAddress: string
      city: string
      state: string
      zipCode: string
      specialInstructions: string | null
      timesDelivered: number
      occurrences: number // How many times this address appears in the database
    }>()

    addresses.forEach((address) => {
      const key = normalizeAddress(address.streetAddress, address.city, address.state, address.zipCode)
      const existing = addressMap.get(key)

      if (existing) {
        // Aggregate: add delivery count, increment occurrences
        existing.timesDelivered += address._count.deliveryLogs
        existing.occurrences += 1
        // Keep special instructions if the existing one is empty
        if (!existing.specialInstructions && address.specialInstructions) {
          existing.specialInstructions = address.specialInstructions
        }
      } else {
        // First occurrence of this address
        addressMap.set(key, {
          id: address.id,
          streetAddress: address.streetAddress,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          specialInstructions: address.specialInstructions,
          timesDelivered: address._count.deliveryLogs,
          occurrences: 1,
        })
      }
    })

    // Convert map to array and sort by street address
    const addressesWithStats = Array.from(addressMap.values())
      .sort((a, b) => a.streetAddress.localeCompare(b.streetAddress))

    return NextResponse.json({
      success: true,
      data: addressesWithStats,
    })
  } catch (error) {
    console.error('Error fetching addresses report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch addresses report' },
      { status: 500 }
    )
  }
}
