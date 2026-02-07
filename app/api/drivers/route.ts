import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const role = searchParams.get('role')
    const includeAll = searchParams.get('includeAll')

    const where: any = {}

    // Filter by role - use boolean fields, fall back to legacy role field
    if (includeAll === 'true') {
      // Include all users
    } else if (role === 'admin') {
      where.isAdmin = true
    } else if (role === 'driver') {
      where.isDriver = true
    } else if (role === 'donor') {
      where.isDonor = true
    } else if (role === 'volunteer') {
      where.isVolunteer = true
    } else if (role) {
      // Legacy support - filter by role string
      where.role = role
    } else {
      // Default to drivers
      where.isDriver = true
    }

    if (active !== null) {
      where.active = active === 'true'
    }

    const drivers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isAdmin: true,
        isDriver: true,
        isDonor: true,
        isVolunteer: true,
        active: true,
        bloomerangId: true,
        passwordHash: true,
        homeStreet: true,
        homeCity: true,
        homeState: true,
        homeZip: true,
        homeLatitude: true,
        homeLongitude: true,
        routes: {
          select: {
            id: true,
            name: true,
            status: true,
            date: true,
          },
          orderBy: {
            date: 'desc',
          },
          take: 5, // Get last 5 routes
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate stats for each driver
    const driversWithStats = await Promise.all(
      drivers.map(async (driver) => {
        const totalRoutes = await prisma.route.count({
          where: { driverId: driver.id },
        })

        const completedRoutes = await prisma.route.count({
          where: {
            driverId: driver.id,
            status: 'completed',
          },
        })

        const totalDeliveries = await prisma.deliveryLog.count({
          where: { driverId: driver.id },
        })

        const { passwordHash, ...driverWithoutHash } = driver
        return {
          ...driverWithoutHash,
          hasPassword: !!passwordHash,
          stats: {
            totalRoutes,
            completedRoutes,
            totalDeliveries,
          },
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: driversWithStats,
    })
  } catch (error) {
    console.error('Error fetching drivers:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch drivers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
