import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/reports/addresses/[id]
 * Get detailed information about a specific address/place
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access reports
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const addressId = parseInt(params.id)

    if (isNaN(addressId)) {
      return NextResponse.json(
        { error: 'Invalid address ID' },
        { status: 400 }
      )
    }

    // Get address with complete delivery history
    const address = await prisma.address.findUnique({
      where: { id: addressId },
      include: {
        route: {
          select: {
            name: true,
            date: true,
          },
        },
        deliveryLogs: {
          include: {
            driver: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
        },
      },
    })

    if (!address) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      )
    }

    // Calculate statistics
    const totalDeliveries = address.deliveryLogs.length
    const foodOutsideCount = address.deliveryLogs.filter((log) => log.foodOutside === true).length
    const foodInsideCount = address.deliveryLogs.filter((log) => log.foodOutside === false).length
    const lastDelivery = address.deliveryLogs[0]

    // Format delivery history
    const deliveryHistory = address.deliveryLogs.map((log) => ({
      id: log.id,
      driverName: log.driver.name,
      completedAt: log.completedAt,
      foodOutside: log.foodOutside,
      notes: log.notes,
      gpsLatitude: log.gpsLatitude,
      gpsLongitude: log.gpsLongitude,
    }))

    return NextResponse.json({
      success: true,
      data: {
        id: address.id,
        streetAddress: address.streetAddress,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        latitude: address.latitude,
        longitude: address.longitude,
        specialInstructions: address.specialInstructions,
        status: address.status,
        routeName: address.route?.name,
        routeDate: address.route?.date,
        totalDeliveries,
        foodOutsideCount,
        foodInsideCount,
        lastDeliveryDate: lastDelivery?.completedAt,
        lastDeliveryDriver: lastDelivery?.driver.name,
        deliveryHistory,
      },
    })
  } catch (error) {
    console.error('Error fetching address details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch address details' },
      { status: 500 }
    )
  }
}
