/**
 * Geocoding service for converting addresses to GPS coordinates
 * Uses Google Geocoding API
 */

export interface GeocodeResult {
  latitude: number
  longitude: number
  formattedAddress?: string
}

export interface GeocodeError {
  error: string
  address: string
}

/**
 * Geocode a single address using Google Geocoding API
 */
export async function geocodeAddress(
  streetAddress: string,
  city: string,
  state: string,
  zipCode: string
): Promise<GeocodeResult | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.error('Google Maps API key not configured')
      return null
    }

    // Build full address string
    const fullAddress = `${streetAddress}, ${city}, ${state} ${zipCode}, USA`
    const encodedAddress = encodeURIComponent(fullAddress)

    // Call Google Geocoding API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    )

    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status}`)
      return null
    }

    const data = await response.json()

    // Check API response status
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0]
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      }
    } else if (data.status === 'ZERO_RESULTS') {
      console.warn(`No geocoding results for: ${fullAddress}`)
      return null
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('Google Geocoding API quota exceeded')
      return null
    } else {
      console.error(`Geocoding failed for ${fullAddress}: ${data.status}`)
      if (data.error_message) {
        console.error(`Error message: ${data.error_message}`)
      }
      return null
    }
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}

/**
 * Geocode multiple addresses with rate limiting
 * Google allows 50 requests per second, but we'll be conservative
 */
export async function geocodeAddresses(
  addresses: Array<{
    streetAddress: string
    city: string
    state: string
    zipCode: string
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<Array<GeocodeResult | null>> {
  const results: Array<GeocodeResult | null> = []
  const delay = 100 // 100ms between requests = max 10 requests/second

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i]

    // Geocode this address
    const result = await geocodeAddress(
      addr.streetAddress,
      addr.city,
      addr.state,
      addr.zipCode
    )

    results.push(result)

    // Report progress
    if (onProgress) {
      onProgress(i + 1, addresses.length)
    }

    // Rate limiting: wait between requests (except for the last one)
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return results
}

/**
 * Estimate cost for geocoding a number of addresses
 * Google Geocoding API costs $5 per 1,000 requests
 */
export function estimateGeocodingCost(addressCount: number): number {
  const costPer1000 = 5
  return (addressCount / 1000) * costPer1000
}
