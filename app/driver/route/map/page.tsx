'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'

export default function RouteMap() {
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const handleBack = () => {
    router.push('/driver/dashboard')
  }

  if (status === 'loading') {
    return <Loading text="Loading map..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Route Map</h1>
          </div>
        </div>
      </header>

      {/* Map Placeholder */}
      <main className="p-4">
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Map View Coming Soon
          </h2>
          <p className="text-gray-600 mb-6">
            Google Maps integration will be added in a future update.
            <br />
            A valid Google Maps API key is required.
          </p>
          <button onClick={handleBack} className="btn btn-primary">
            Return to Dashboard
          </button>
        </div>
      </main>
    </div>
  )
}
