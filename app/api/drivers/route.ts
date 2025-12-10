import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')

    const where: any = {
      role: 'driver',
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
        active: true,
        bloomerangId: true,
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

        return {
          ...driver,
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
