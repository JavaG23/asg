import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/directions
 * Fetch turn-by-turn directions from Google Maps Directions API
 *
 * Query params:
 * - origin: "lat,lng" (e.g., "38.9072,-77.0369")
 * - destination: "lat,lng"
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const origin = searchParams.get('origin')
    const destination = searchParams.get('destination')

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Google Maps API key not configured',
          message: 'Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables',
        },
        { status: 500 }
      )
    }

    // Call Google Directions API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${encodeURIComponent(origin)}&` +
      `destination=${encodeURIComponent(destination)}&` +
      `key=${apiKey}` +
      `&mode=driving` +
      `&units=imperial` +
      `&alternatives=false`
    )

    if (!response.ok) {
      throw new Error(`Google Maps API returned ${response.status}`)
    }

    const data = await response.json()

    // Check for API errors
    if (data.status !== 'OK') {
      console.error('Google Directions API error:', data.status, data.error_message)

      const errorMessages: Record<string, string> = {
        'NOT_FOUND': 'Could not find a route to this destination',
        'ZERO_RESULTS': 'No route found between these locations',
        'MAX_WAYPOINTS_EXCEEDED': 'Too many waypoints in route',
        'INVALID_REQUEST': 'Invalid route request',
        'OVER_QUERY_LIMIT': 'API quota exceeded. Please try again later.',
        'REQUEST_DENIED': 'API key is invalid or restricted',
        'UNKNOWN_ERROR': 'Server error. Please try again.',
      }

      return NextResponse.json(
        {
          error: errorMessages[data.status] || 'Failed to get directions',
          status: data.status,
          message: data.error_message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching directions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch directions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
