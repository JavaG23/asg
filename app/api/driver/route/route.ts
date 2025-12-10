import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/driver/route
 * Fetch the current driver's active route with all addresses
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = parseInt((session.user as any).id)

    // Find the driver's most recent active or pending route
    const route = await prisma.route.findFirst({
      where: {
        driverId: userId,
        status: {
          in: ['pending', 'active'],
        },
      },
      include: {
        addresses: {
          orderBy: {
            sequenceOrder: 'asc',
          },
          include: {
            deliveryLogs: {
              where: {
                driverId: userId,
              },
              orderBy: {
                completedAt: 'desc',
              },
              take: 1,
            },
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    if (!route) {
      return NextResponse.json(
        { error: 'No active route found' },
        { status: 404 }
      )
    }

    // Calculate progress
    const totalStops = route.addresses.length
    const completedStops = route.addresses.filter(
      (addr) => addr.status === 'completed'
    ).length
    const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0

    // Find next stop
    const nextStop = route.addresses.find(
      (addr) => addr.status === 'pending'
    )

    return NextResponse.json({
      route: {
        id: route.id,
        name: route.name,
        date: route.date,
        status: route.status,
        driver: route.driver,
        totalStops,
        completedStops,
        progress: Math.round(progress),
        nextStop: nextStop
          ? {
              id: nextStop.id,
              sequenceOrder: nextStop.sequenceOrder,
              streetAddress: nextStop.streetAddress,
              city: nextStop.city,
              state: nextStop.state,
              zipCode: nextStop.zipCode,
              latitude: nextStop.latitude,
              longitude: nextStop.longitude,
              specialInstructions: nextStop.specialInstructions,
              status: nextStop.status,
            }
          : null,
        addresses: route.addresses.map((addr) => ({
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
          deliveryLog:
            addr.deliveryLogs.length > 0
              ? {
                  id: addr.deliveryLogs[0].id,
                  foodOutside: addr.deliveryLogs[0].foodOutside,
                  notes: addr.deliveryLogs[0].notes,
                  completedAt: addr.deliveryLogs[0].completedAt,
                  gpsLatitude: addr.deliveryLogs[0].gpsLatitude,
                  gpsLongitude: addr.deliveryLogs[0].gpsLongitude,
                }
              : null,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching driver route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch route data' },
      { status: 500 }
    )
  }
}
