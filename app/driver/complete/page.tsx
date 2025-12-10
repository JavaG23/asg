'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { MapPin, LogOut } from 'lucide-react'

export default function RouteCompletePage() {
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const handleNavigateToCenter = () => {
    const distributionCenter = process.env.NEXT_PUBLIC_DISTRIBUTION_CENTER_ADDRESS

    if (!distributionCenter) {
      alert('Distribution center address not configured. Please contact your administrator.')
      return
    }

    // Open Google Maps with navigation to distribution center
    // Works on both mobile and desktop
    const encodedAddress = encodeURIComponent(distributionCenter)

    // Use address text (distribution center is a real address)
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`

    window.open(mapsUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 to-success-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Celebration */}
        <div className="text-center">
          <div className="text-8xl mb-6 animate-bounce">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Hooray!
          </h1>
          <h2 className="text-2xl font-semibold text-success-700 mb-2">
            You finished all the pick-ups!
          </h2>
          <p className="text-lg text-gray-600">Great Job!</p>
        </div>

        {/* Congratulations Card */}
        <div className="card bg-white space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-gray-700 mb-4">
              Thank you for your dedication to A Simple Gesture!
            </p>
            <p className="text-sm text-gray-600">
              Your volunteer hours have been automatically logged to Bloomerang.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleNavigateToCenter}
            className="w-full btn btn-primary py-4 text-lg flex items-center justify-center gap-3"
          >
            <MapPin className="w-6 h-6" />
            Navigate to Distribution Center
          </button>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full btn btn-secondary py-4 text-lg flex items-center justify-center gap-3"
          >
            <LogOut className="w-6 h-6" />
            Sign Out
          </button>
        </div>

        {/* Additional Info */}
        <div className="card bg-info-50 border border-info-200">
          <p className="text-sm text-info-900 text-center">
            💡 Once at the distribution center, please check in with the coordinator.
          </p>
        </div>
      </div>
    </div>
  )
}
