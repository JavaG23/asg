import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import { logDriverRouteHours } from '@/lib/services/driver-routes-sync'

/**
 * PUT /api/delivery/[addressId]
 * Mark a delivery as completed and log the details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { addressId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt((session.user as any).id)
    const addressId = parseInt(params.addressId)

    if (isNaN(addressId)) {
      return NextResponse.json(
        { error: 'Invalid address ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      foodOutside,
      notes,
      gpsLatitude,
      gpsLongitude,
      skip = false,
    } = body

    // Verify the address exists and belongs to driver's route
    const address = await prisma.address.findUnique({
      where: { id: addressId },
      include: {
        route: {
          select: {
            driverId: true,
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

    if (address.route.driverId !== userId) {
      return NextResponse.json(
        { error: 'Address does not belong to your route' },
        { status: 403 }
      )
    }

    // Update address status
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: {
        status: skip ? 'skipped' : 'completed',
      },
    })

    // Create delivery log (only if not skipped)
    let deliveryLog = null
    if (!skip) {
      deliveryLog = await prisma.deliveryLog.create({
        data: {
          addressId,
          driverId: userId,
          foodOutside: foodOutside ?? null,
          notes: notes || null,
          gpsLatitude: gpsLatitude ?? null,
          gpsLongitude: gpsLongitude ?? null,
        },
      })
    }

    // Check if all addresses in route are completed
    const route = await prisma.route.findUnique({
      where: { id: address.routeId },
      include: {
        addresses: true,
      },
    })

    if (route) {
      const allCompleted = route.addresses.every(
        (addr) => addr.status === 'completed' || addr.status === 'skipped'
      )

      if (allCompleted && route.status !== 'completed' && route.status !== 'pending_weight') {
        // Bag delivery routes go directly to completed (no weight needed)
        // Pickup routes go to pending_weight (admin needs to enter total weight)
        const newStatus = route.routeType === 'bag_delivery' ? 'completed' : 'pending_weight'
        await prisma.route.update({
          where: { id: route.id },
          // 65j: completedAt marks when all stops were done (both route types)
          data: { status: newStatus, completedAt: new Date() },
        })
        // 65j: auto-log the driver's volunteer hours (non-fatal, deduped by routeId)
        await logDriverRouteHours(route.id)
      } else if (route.status === 'pending') {
        // Mark route as active when first delivery is made and record start time
        await prisma.route.update({
          where: { id: route.id },
          data: {
            status: 'active',
            startedAt: new Date(),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      address: updatedAddress,
      deliveryLog,
    })
  } catch (error) {
    console.error('Error logging delivery:', error)
    return NextResponse.json(
      { error: 'Failed to log delivery' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/delivery/[addressId]
 * Get delivery details for a specific address
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { addressId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addressId = parseInt(params.addressId)

    if (isNaN(addressId)) {
      return NextResponse.json(
        { error: 'Invalid address ID' },
        { status: 400 }
      )
    }

    const address = await prisma.address.findUnique({
      where: { id: addressId },
      include: {
        deliveryLogs: {
          orderBy: {
            completedAt: 'desc',
          },
          take: 1,
        },
        route: {
          select: {
            id: true,
            name: true,
            driverId: true,
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

    return NextResponse.json({
      address: {
        id: address.id,
        streetAddress: address.streetAddress,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        latitude: address.latitude,
        longitude: address.longitude,
        specialInstructions: address.specialInstructions,
        status: address.status,
        deliveryLog:
          address.deliveryLogs.length > 0 ? address.deliveryLogs[0] : null,
      },
    })
  } catch (error) {
    console.error('Error fetching delivery:', error)
    return NextResponse.json(
      { error: 'Failed to fetch delivery data' },
      { status: 500 }
    )
  }
}
