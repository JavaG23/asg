import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

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

      if (allCompleted && route.status !== 'completed') {
        // Mark route as completed
        await prisma.route.update({
          where: { id: route.id },
          data: { status: 'completed' },
        })

        // Archive the completed route to permanent history
        try {
          // Get complete route data for archiving
          const completeRoute = await prisma.route.findUnique({
            where: { id: route.id },
            include: {
              driver: { select: { name: true, email: true, phone: true } },
              addresses: {
                orderBy: { sequenceOrder: 'asc' },
                include: {
                  deliveryLogs: {
                    include: { driver: { select: { name: true } } },
                    orderBy: { completedAt: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          })

          if (completeRoute) {
            // Calculate statistics
            const totalStops = completeRoute.addresses.length
            const completedStops = completeRoute.addresses.filter((a) => a.status === 'completed').length
            const skippedStops = completeRoute.addresses.filter((a) => a.status === 'skipped').length
            const completionRate = totalStops > 0 ? (completedStops / totalStops) * 100 : 0
            const volunteerHours = 2 // Estimate

            // Prepare snapshot
            const routeSnapshot = {
              route: {
                id: completeRoute.id,
                name: completeRoute.name,
                date: completeRoute.date,
                status: 'completed',
                driverId: completeRoute.driverId,
              },
              driver: completeRoute.driver,
              addresses: completeRoute.addresses.map((addr) => ({
                id: addr.id,
                sequenceOrder: addr.sequenceOrder,
                streetAddress: addr.streetAddress,
                city: addr.city,
                state: addr.state,
                zipCode: addr.zipCode,
                latitude: addr.latitude,
                longitude: addr.longitude,
                specialInstructions: addr.specialInstructions,
                status: addr.status,
                deliveryLog: addr.deliveryLogs[0] || null,
              })),
              stats: { totalStops, completedStops, skippedStops, completionRate, volunteerHours },
              archivedAt: new Date().toISOString(),
            }

            // Check if already archived
            const existingArchive = await prisma.routeArchive.findFirst({
              where: { routeId: completeRoute.id },
            })

            // Create archive if doesn't exist
            if (!existingArchive) {
              await prisma.routeArchive.create({
                data: {
                  routeId: completeRoute.id,
                  routeName: completeRoute.name,
                  routeDate: completeRoute.date,
                  driverName: completeRoute.driver?.name || null,
                  driverEmail: completeRoute.driver?.email || null,
                  driverPhone: completeRoute.driver?.phone || null,
                  totalStops,
                  completedStops,
                  skippedStops,
                  completionRate,
                  volunteerHours,
                  routeData: JSON.stringify(routeSnapshot),
                },
              })
              console.log('Route automatically archived:', completeRoute.id)
            }
          }
        } catch (archiveError) {
          // Log error but don't fail the delivery
          console.error('Error auto-archiving route:', archiveError)
        }
      } else if (route.status === 'pending') {
        // Mark route as active when first delivery is made
        await prisma.route.update({
          where: { id: route.id },
          data: { status: 'active' },
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
