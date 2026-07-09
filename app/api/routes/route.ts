import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import { syncDriverRoutesShift } from '@/lib/services/driver-routes-sync'

async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return { error: NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 }) }
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return { error: NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 }) }
  }
  return { user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if ('error' in auth && auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const driverId = searchParams.get('driverId')

    // Build where clause
    const where: any = {}

    if (date) {
      const targetDate = new Date(date)
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    if (status) {
      where.status = status
    }

    if (driverId) {
      where.driverId = parseInt(driverId)
    }

    // Fetch routes with related data
    const routes = await prisma.route.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        addresses: {
          orderBy: {
            sequenceOrder: 'asc',
          },
          include: {
            deliveryLogs: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate stats for each route
    const routesWithStats = routes.map((route) => {
      const totalStops = route.addresses.length
      const completedStops = route.addresses.filter((addr) => addr.status === 'completed').length
      const percentComplete = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0

      return {
        ...route,
        stats: {
          totalStops,
          completedStops,
          percentComplete,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: routesWithStats,
    })
  } catch (error) {
    console.error('Error fetching routes:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch routes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if ('error' in auth && auth.error) return auth.error
    if (!auth.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, driverId, date, addresses } = body

    // Validate required fields
    if (!name || !date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Route name and date are required',
        },
        { status: 400 }
      )
    }

    // Parse date at noon UTC to avoid timezone day-boundary issues
    const routeDate = new Date(date + 'T12:00:00Z')

    // Create route
    const route = await prisma.route.create({
      data: {
        name,
        driverId: driverId ? parseInt(driverId) : null,
        date: routeDate,
        status: 'pending',
        addresses: addresses
          ? {
              create: addresses.map((addr: any, index: number) => ({
                sequenceOrder: addr.sequenceOrder || index + 1,
                streetAddress: addr.streetAddress,
                city: addr.city,
                state: addr.state,
                zipCode: addr.zipCode,
                latitude: addr.latitude || null,
                longitude: addr.longitude || null,
                specialInstructions: addr.specialInstructions || null,
                status: 'pending',
              })),
            }
          : undefined,
      },
      include: {
        driver: true,
        addresses: true,
      },
    })

    // 65j: keep the Driver Routes volunteer opportunity in sync (non-fatal)
    await syncDriverRoutesShift(routeDate)

    return NextResponse.json({
      success: true,
      data: route,
    })
  } catch (error) {
    console.error('Error creating route:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
