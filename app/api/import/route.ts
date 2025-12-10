import { NextRequest, NextResponse } from 'next/server'
import { parseAndImportCSV } from '@/lib/services/csv-parser'

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

    // Parse and import CSV
    const result = await parseAndImportCSV(content)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Import failed',
          imported: result.imported,
          errors: result.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      imported: result.imported,
      routes: result.routes,
      errors: result.errors,
      message: `Successfully imported ${result.imported} routes`,
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
