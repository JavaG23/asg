'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { TruckIcon, LogIn } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'authenticated' && session?.user) {
      // Redirect logged-in users to their dashboard based on role
      const role = (session.user as any).role
      if (role === 'admin') {
        router.replace('/admin/dashboard')
      } else {
        router.replace('/driver/dashboard')
      }
    } else {
      setChecking(false)
    }
  }, [status, session, router])

  // Show loading state while checking auth
  if (status === 'loading' || checking) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <TruckIcon className="w-16 h-16 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ASG App
          </h1>
          <p className="text-gray-600">
            A Simple Gesture - Volunteer Management
          </p>
        </div>

        {/* Single Sign In Button */}
        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full"
          >
            <button className="w-full btn btn-primary py-4 text-lg flex items-center justify-center gap-3">
              <LogIn className="w-6 h-6" />
              Sign In
            </button>
          </Link>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-gray-500">
          <p>Drivers, Admins, and Volunteers</p>
          <p className="mt-2">v3.1.0</p>
        </div>
      </div>
    </main>
  )
}
