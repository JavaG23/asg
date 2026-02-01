'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { MapPin, LogOut, HelpCircle, User, RefreshCw, TruckIcon } from 'lucide-react'

export default function RouteCompletePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [checking, setChecking] = useState(false)

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

    const encodedAddress = encodeURIComponent(distributionCenter)
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`

    window.open(mapsUrl, '_blank')
  }

  const handleCheckForNewRoute = async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/driver/route')
      if (response.ok) {
        // New route found, redirect to dashboard
        router.push('/driver/dashboard')
      } else {
        // No new route yet
        setChecking(false)
      }
    } catch (error) {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-6 h-6 text-primary-600" />
              <h1 className="text-xl font-bold text-gray-900">ASG Driver</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/driver/help')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Help"
              >
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => router.push('/driver/profile')}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {session?.user?.name || 'Profile'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex items-center justify-center">
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
                Please head to the distribution center to drop off and weigh the collected food.
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
              onClick={handleCheckForNewRoute}
              disabled={checking}
              className="w-full btn btn-secondary py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking...' : 'Check for New Route'}
            </button>

            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full btn btn-secondary py-3 flex items-center justify-center gap-3 text-gray-600"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>

          {/* Additional Info */}
          <div className="card bg-info-50 border border-info-200">
            <p className="text-sm text-info-900 text-center">
              💡 Once at the distribution center, check in with the coordinator. After weighing, your route will be marked complete.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => router.push('/driver/help')}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <HelpCircle className="w-4 h-4" />
              Help
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => router.push('/driver/profile')}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <User className="w-4 h-4" />
              Profile
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
