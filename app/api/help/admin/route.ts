import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'docs', 'admin-guide.md')
    const content = readFileSync(filePath, 'utf-8')

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error reading admin guide:', error)
    return new NextResponse('# Help content not found\n\nThe documentation file could not be loaded.', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
}
