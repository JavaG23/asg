import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import { parseAndImportCSV } from '@/lib/services/csv-parser'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const eventDateStr = formData.get('eventDate') as string | null
    const routeType = (formData.get('routeType') as string) || 'pickup'

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      )
    }

    // Validate event date
    if (!eventDateStr) {
      return NextResponse.json(
        {
          success: false,
          error: 'No event date provided',
          message: 'Please select an event date',
        },
        { status: 400 }
      )
    }

    // Parse the event date
    const eventDate = new Date(eventDateStr)
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid event date',
          message: 'Please provide a valid event date',
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type',
          message: 'Please upload a CSV file',
        },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large',
          message: 'Maximum file size is 10MB',
        },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()

    // Parse and import CSV with event date and route type
    const result = await parseAndImportCSV(content, eventDate, routeType)

    // If no routes were imported and there are errors, return failure
    if (result.imported === 0 && result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Import failed',
          imported: result.imported,
          routes: result.routes,
          errors: result.errors,
          routesWithDrivers: result.routesWithDrivers || 0,
          routesWithoutDrivers: result.routesWithoutDrivers || 0,
        },
        { status: 400 }
      )
    }

    // Return success if routes were imported (even if there are some warnings)
    return NextResponse.json({
      success: true,
      imported: result.imported,
      routes: result.routes,
      errors: result.errors,
      routesWithDrivers: result.routesWithDrivers || 0,
      routesWithoutDrivers: result.routesWithoutDrivers || 0,
      message: `Successfully imported ${result.imported} routes (${result.routesWithDrivers || 0} with drivers, ${result.routesWithoutDrivers || 0} need assignment)`,
    })
  } catch (error) {
    console.error('Error importing CSV:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to import CSV',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
