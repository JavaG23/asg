import { NextRequest, NextResponse } from 'next/server'
import { parseAndImportDriversCSV } from '@/lib/services/csv-parser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
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

    // Parse and import drivers CSV
    const result = await parseAndImportDriversCSV(content)

    if (!result.success && result.errors.length > 0 && result.imported === 0 && result.updated === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Import failed',
          imported: result.imported,
          updated: result.updated,
          drivers: result.drivers,
          errors: result.errors,
          driversWithPassword: result.driversWithPassword,
          driversWithoutPassword: result.driversWithoutPassword,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      imported: result.imported,
      updated: result.updated,
      drivers: result.drivers,
      errors: result.errors,
      driversWithPassword: result.driversWithPassword,
      driversWithoutPassword: result.driversWithoutPassword,
      message: `Successfully imported ${result.imported} new driver(s) and updated ${result.updated} existing driver(s)`,
    })
  } catch (error) {
    console.error('Error importing drivers CSV:', error)
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
