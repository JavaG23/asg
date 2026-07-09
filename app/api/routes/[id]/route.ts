import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/database/client'
import { authOptions } from '@/lib/auth/config'
import { logFieldChanges, logChange } from '@/lib/services/changelog'
import { syncDriverRoutesShift } from '@/lib/services/driver-routes-sync'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const routeId = parseInt(params.id)

    if (isNaN(routeId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid route ID',
        },
        { status: 400 }
      )
    }

    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        addresses: {
          orderBy: {
            sequenceOrder: 'asc',
          },
          include: {
            deliveryLogs: {
              include: {
                driver: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!route) {
      return NextResponse.json(
        {
          success: false,
          error: 'Route not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: route,
    })
  } catch (error) {
    console.error('Error fetching route:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const routeId = parseInt(params.id)
    const body = await request.json()

    if (isNaN(routeId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid route ID',
        },
        { status: 400 }
      )
    }

    const { driverId, status, name, routeType } = body

    // Get original route for change logging
    const originalRoute = await prisma.route.findUnique({
      where: { id: routeId },
      select: { name: true, status: true, driverId: true, routeType: true },
    })

    // Update route
    const route = await prisma.route.update({
      where: { id: routeId },
      data: {
        ...(driverId !== undefined && { driverId: driverId ? parseInt(driverId) : null }),
        ...(status && { status }),
        ...(name && { name }),
        ...(routeType && { routeType }),
      },
      include: {
        driver: true,
        addresses: {
          orderBy: {
            sequenceOrder: 'asc',
          },
        },
      },
    })

    // Log changes
    if (originalRoute && session?.user) {
      const userId = parseInt((session.user as any).id)
      const userName = (session.user as any).name
      await logFieldChanges({
        userId,
        userName,
        entityType: 'route',
        entityId: routeId,
        entityName: route.name,
        changes: [
          { field: 'name', oldValue: originalRoute.name, newValue: route.name },
          { field: 'status', oldValue: originalRoute.status, newValue: route.status },
          { field: 'driverId', oldValue: originalRoute.driverId, newValue: route.driverId },
          { field: 'routeType', oldValue: originalRoute.routeType, newValue: route.routeType },
        ],
      })
    }

    return NextResponse.json({
      success: true,
      data: route,
    })
  } catch (error) {
    console.error('Error updating route:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const routeId = parseInt(params.id)

    if (isNaN(routeId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid route ID',
        },
        { status: 400 }
      )
    }

    // Get route info for logging (+ date for the driver-routes shift sync, 65j)
    const routeInfo = await prisma.route.findUnique({
      where: { id: routeId },
      select: { name: true, date: true },
    })

    // Use a transaction to delete route and all related records
    await prisma.$transaction(async (tx) => {
      // First, get all addresses for this route
      const addresses = await tx.address.findMany({
        where: { routeId },
        select: { id: true },
      })

      const addressIds = addresses.map((addr) => addr.id)

      // Delete all delivery logs for these addresses
      if (addressIds.length > 0) {
        await tx.deliveryLog.deleteMany({
          where: {
            addressId: { in: addressIds },
          },
        })
      }

      // Delete all addresses for this route
      await tx.address.deleteMany({
        where: { routeId },
      })

      // Finally, delete the route itself
      await tx.route.delete({
        where: { id: routeId },
      })
    })

    // 65j: keep the Driver Routes volunteer opportunity in sync (non-fatal)
    if (routeInfo?.date) {
      await syncDriverRoutesShift(routeInfo.date)
    }

    // Log the deletion
    if (session?.user) {
      await logChange({
        userId: parseInt((session.user as any).id),
        userName: (session.user as any).name,
        action: 'delete',
        entityType: 'route',
        entityId: routeId,
        entityName: routeInfo?.name,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Route deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting route:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
