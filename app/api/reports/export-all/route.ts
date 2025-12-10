import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

/**
 * GET /api/reports/export-all
 * Export all data (drivers, addresses, delivery logs) to CSV
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

    // Get all data including archived routes
    const [drivers, addresses, archivedRoutes] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'driver' },
        include: {
          _count: {
            select: {
              routes: { where: { status: 'completed' } },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.address.findMany({
        include: {
          deliveryLogs: {
            include: {
              driver: {
                select: { name: true },
              },
            },
            orderBy: { completedAt: 'desc' },
          },
        },
        orderBy: { streetAddress: 'asc' },
      }),
      prisma.routeArchive.findMany({
        orderBy: { routeDate: 'desc' },
      }),
    ])

    // Generate CSV sections
    const csvSections: string[] = []

    // DRIVERS SECTION
    csvSections.push('=== DRIVERS ===')
    csvSections.push('Name,Email,Phone,Routes Completed,Volunteer Hours (Estimated)')
    drivers.forEach((driver) => {
      const routesCompleted = driver._count.routes
      const volunteerHours = routesCompleted * 2
      csvSections.push(
        [
          `"${driver.name}"`,
          driver.email,
          driver.phone || '',
          routesCompleted.toString(),
          volunteerHours.toString(),
        ].join(',')
      )
    })
    csvSections.push('')

    // ADDRESSES SECTION
    csvSections.push('=== PLACES (PICKUP LOCATIONS) ===')
    csvSections.push(
      'Street Address,City,State,Zip,Special Instructions,Times Delivered,Last Delivery Date,Last Food Outside Response'
    )
    addresses.forEach((address) => {
      const lastLog = address.deliveryLogs[0]
      csvSections.push(
        [
          `"${address.streetAddress}"`,
          address.city,
          address.state,
          address.zipCode,
          address.specialInstructions ? `"${address.specialInstructions.replace(/"/g, '""')}"` : '',
          address.deliveryLogs.length.toString(),
          lastLog ? new Date(lastLog.completedAt).toLocaleDateString() : '',
          lastLog?.foodOutside !== null && lastLog?.foodOutside !== undefined
            ? lastLog.foodOutside
              ? 'Yes'
              : 'No'
            : '',
        ].join(',')
      )
    })
    csvSections.push('')

    // ROUTES SECTION (from permanent archive)
    csvSections.push('=== COMPLETED ROUTES (HISTORICAL ARCHIVE) ===')
    csvSections.push('Route Name,Date,Driver,Total Stops,Completed Stops,Completion %,Volunteer Hours,Archived Date')
    archivedRoutes.forEach((route) => {
      csvSections.push(
        [
          `"${route.routeName}"`,
          new Date(route.routeDate).toLocaleDateString(),
          route.driverName || 'Unassigned',
          route.totalStops.toString(),
          route.completedStops.toString(),
          `${Math.round(route.completionRate)}%`,
          route.volunteerHours.toString(),
          new Date(route.completedAt).toLocaleDateString(),
        ].join(',')
      )
    })

    // Add header with metadata
    const csvContent = [
      'A Simple Gesture - Full Data Export',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      ...csvSections,
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="asg_full_report_${
          new Date().toISOString().split('T')[0]
        }.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting all data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
