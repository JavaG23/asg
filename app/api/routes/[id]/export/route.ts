import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/routes/[id]/export
 * Export route data to CSV format
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

    // Only admins can export routes
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const routeId = parseInt(params.id)

    if (isNaN(routeId)) {
      return NextResponse.json(
        { error: 'Invalid route ID' },
        { status: 400 }
      )
    }

    // Fetch route with all addresses and delivery logs
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        driver: {
          select: {
            name: true,
            email: true,
          },
        },
        addresses: {
          orderBy: {
            sequenceOrder: 'asc',
          },
          include: {
            deliveryLogs: {
              orderBy: {
                completedAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    })

    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      )
    }

    // Generate CSV content
    const headers = [
      'Stop #',
      'Street Address',
      'City',
      'State',
      'Zip Code',
      'Special Instructions',
      'Status',
      'Food Outside',
      'Notes',
      'Completed At',
    ]

    const rows = route.addresses.map((address) => {
      const log = address.deliveryLogs[0]
      return [
        address.sequenceOrder,
        `"${address.streetAddress}"`,
        address.city,
        address.state,
        address.zipCode,
        address.specialInstructions ? `"${address.specialInstructions}"` : '',
        address.status,
        log?.foodOutside !== null ? (log.foodOutside ? 'Yes' : 'No') : '',
        log?.notes ? `"${log.notes}"` : '',
        log?.completedAt ? new Date(log.completedAt).toLocaleString() : '',
      ]
    })

    const csvContent = [
      `Route: ${route.name}`,
      `Driver: ${route.driver?.name || 'Unassigned'}`,
      `Date: ${new Date(route.date).toLocaleDateString()}`,
      `Status: ${route.status}`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${route.name}_${
          new Date().toISOString().split('T')[0]
        }.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting route:', error)
    return NextResponse.json(
      { error: 'Failed to export route' },
      { status: 500 }
    )
  }
}
