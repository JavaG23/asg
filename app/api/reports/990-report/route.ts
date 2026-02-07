import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/reports/990-report
 * Get 990 tax filing report data for a date range
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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const startDateTime = new Date(startDate)
    const endDateTime = new Date(endDate)
    endDateTime.setHours(23, 59, 59, 999) // Include full end day

    // Get completed routes in the date range from RouteArchive
    const completedRoutes = await prisma.routeArchive.findMany({
      where: {
        routeDate: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      orderBy: { routeDate: 'asc' },
    })

    // Calculate in-kind contributions (food weight)
    const totalFoodWeight = completedRoutes.reduce(
      (sum, route) => sum + (route.totalWeight || 0),
      0
    )

    // Get unique drivers/volunteers who participated
    const volunteerEmails = new Set<string>()
    const volunteerData: { name: string; email: string; phone: string | null; routesCompleted: number }[] = []

    const driverMap = new Map<string, { name: string; email: string; phone: string | null; routes: number }>()

    completedRoutes.forEach((route) => {
      if (route.driverEmail) {
        volunteerEmails.add(route.driverEmail)
        const existing = driverMap.get(route.driverEmail)
        if (existing) {
          existing.routes++
        } else {
          driverMap.set(route.driverEmail, {
            name: route.driverName || 'Unknown',
            email: route.driverEmail,
            phone: route.driverPhone || null,
            routes: 1,
          })
        }
      }
    })

    driverMap.forEach((driver) => {
      volunteerData.push({
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        routesCompleted: driver.routes,
      })
    })

    // Get donor/stop data from routeData JSON (includes addresses with donor contact info)
    interface DonorEntry {
      name: string | null
      email: string | null
      phone: string | null
      address: string
      city: string
      state: string
      zip: string
      donationDates: string[]
      foodOutsideYes: number
      foodOutsideNo: number
      notes: string[]
    }

    const donorMap = new Map<string, DonorEntry>()
    let totalStops = 0
    let completedStops = 0
    let foodOutsideYesTotal = 0
    let foodOutsideNoTotal = 0

    completedRoutes.forEach((route) => {
      totalStops += route.totalStops
      completedStops += route.completedStops

      try {
        const routeSnapshot = JSON.parse(route.routeData)
        if (routeSnapshot.addresses && Array.isArray(routeSnapshot.addresses)) {
          routeSnapshot.addresses.forEach((address: any) => {
            // Use address as key for deduplication
            const addrKey = `${address.streetAddress?.toLowerCase()}_${address.city?.toLowerCase()}_${address.state?.toLowerCase()}_${address.zipCode}`

            // Track food outside responses
            if (address.deliveryLog) {
              if (address.deliveryLog.foodOutside === true) {
                foodOutsideYesTotal++
              } else if (address.deliveryLog.foodOutside === false) {
                foodOutsideNoTotal++
              }
            }

            const existing = donorMap.get(addrKey)
            if (existing) {
              // Add this donation date
              const dateStr = new Date(route.routeDate).toISOString().split('T')[0]
              if (!existing.donationDates.includes(dateStr)) {
                existing.donationDates.push(dateStr)
              }
              // Update food outside counts
              if (address.deliveryLog?.foodOutside === true) {
                existing.foodOutsideYes++
              } else if (address.deliveryLog?.foodOutside === false) {
                existing.foodOutsideNo++
              }
              // Collect notes
              if (address.deliveryLog?.notes) {
                existing.notes.push(address.deliveryLog.notes)
              }
              // Update donor contact info if not already set
              if (!existing.name && address.donorName) existing.name = address.donorName
              if (!existing.email && address.donorEmail) existing.email = address.donorEmail
              if (!existing.phone && address.donorPhone) existing.phone = address.donorPhone
            } else {
              const entry: DonorEntry = {
                name: address.donorName || null,
                email: address.donorEmail || null,
                phone: address.donorPhone || null,
                address: address.streetAddress || '',
                city: address.city || '',
                state: address.state || '',
                zip: address.zipCode || '',
                donationDates: [new Date(route.routeDate).toISOString().split('T')[0]],
                foodOutsideYes: address.deliveryLog?.foodOutside === true ? 1 : 0,
                foodOutsideNo: address.deliveryLog?.foodOutside === false ? 1 : 0,
                notes: address.deliveryLog?.notes ? [address.deliveryLog.notes] : [],
              }
              donorMap.set(addrKey, entry)
            }
          })
        }
      } catch (e) {
        console.error('Error parsing routeData for route', route.id, e)
      }
    })

    const donors = Array.from(donorMap.values())

    // Calculate volunteer hours (estimate based on route duration)
    let totalVolunteerMinutes = 0
    completedRoutes.forEach((route) => {
      if (route.startedAt && route.weighedAt) {
        const start = new Date(route.startedAt).getTime()
        const end = new Date(route.weighedAt).getTime()
        totalVolunteerMinutes += (end - start) / (1000 * 60)
      } else {
        // Estimate ~1 hour per route if no timing data
        totalVolunteerMinutes += route.volunteerHours * 60 || 60
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
        },
        summary: {
          totalDonors: donors.length,
          totalInKindContributions: totalFoodWeight,
          totalVolunteers: volunteerEmails.size,
          totalVolunteerHours: Math.round(totalVolunteerMinutes / 60 * 10) / 10,
          totalRoutes: completedRoutes.length,
          totalStops,
          completedStops,
          foodOutsideYes: foodOutsideYesTotal,
          foodOutsideNo: foodOutsideNoTotal,
        },
        donors,
        volunteers: volunteerData.sort((a, b) => a.name.localeCompare(b.name)),
        routes: completedRoutes.map((route) => ({
          id: route.id,
          name: route.routeName,
          date: route.routeDate,
          driverName: route.driverName,
          totalWeight: route.totalWeight,
          totalStops: route.totalStops,
          completedStops: route.completedStops,
          volunteerHours: route.volunteerHours,
        })),
      },
    })
  } catch (error) {
    console.error('Error generating 990 report:', error)

    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
