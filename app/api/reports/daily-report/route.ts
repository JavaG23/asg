import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/reports/daily-report?date=YYYY-MM-DD
 * Export daily route report showing each driver, address, responses, and notes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access reports
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')

    if (!dateStr) {
      return NextResponse.json(
        { error: 'Date parameter is required (format: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Parse date and get start/end of day
    const targetDate = new Date(dateStr)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    // Get all archived routes for this date (permanent historical record)
    const archivedRoutes = await prisma.routeArchive.findMany({
      where: {
        routeDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { routeName: 'asc' },
    })

    if (archivedRoutes.length === 0) {
      // Return empty CSV instead of 404
      const csvContent = [
        `Daily Route Report - ${dateStr}`,
        `Generated: ${new Date().toLocaleString()}`,
        '',
        'No completed routes found for this date.',
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="daily_route_report_${dateStr}_empty.csv"`,
        },
      })
    }

    // Generate CSV content
    const headers = [
      'Route Name',
      'Driver',
      'Driver Email',
      'Stop #',
      'Street Address',
      'City',
      'State',
      'Zip',
      'Special Instructions',
      'Status',
      'Food Outside',
      'Notes',
      'Completed At',
      'GPS Latitude',
      'GPS Longitude',
    ]

    const rows: string[][] = []

    archivedRoutes.forEach((archivedRoute) => {
      // Parse the JSON snapshot
      const routeData = JSON.parse(archivedRoute.routeData)

      routeData.addresses.forEach((address: any) => {
        const log = address.deliveryLog

        rows.push([
          archivedRoute.routeName,
          archivedRoute.driverName || 'Unassigned',
          archivedRoute.driverEmail || '',
          address.sequenceOrder.toString(),
          `"${address.streetAddress}"`,
          address.city,
          address.state,
          address.zipCode,
          address.specialInstructions ? `"${address.specialInstructions.replace(/"/g, '""')}"` : '',
          address.status,
          log?.foodOutside !== null && log?.foodOutside !== undefined
            ? log.foodOutside
              ? 'Yes'
              : 'No'
            : '',
          log?.notes ? `"${log.notes.replace(/"/g, '""')}"` : '',
          log?.completedAt ? new Date(log.completedAt).toLocaleString() : '',
          log?.gpsLatitude?.toString() || '',
          log?.gpsLongitude?.toString() || '',
        ])
      })
    })

    const csvContent = [
      `Daily Route Report - ${dateStr}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="daily_route_report_${dateStr}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error generating daily report:', error)
    return NextResponse.json(
      { error: 'Failed to generate daily report' },
      { status: 500 }
    )
  }
}
