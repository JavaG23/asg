import Link from 'next/link'
import { TruckIcon, UserCircle } from 'lucide-react'

export default function HomePage() {
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

        {/* Login Options */}
        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full"
          >
            <button className="w-full btn btn-primary py-4 text-lg flex items-center justify-center gap-3">
              <UserCircle className="w-6 h-6" />
              Driver Login
            </button>
          </Link>

          <Link
            href="/login"
            className="block w-full"
          >
            <button className="w-full btn btn-secondary py-4 text-lg flex items-center justify-center gap-3">
              <UserCircle className="w-6 h-6" />
              Admin Login
            </button>
          </Link>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-gray-500">
          <p>Authentication powered by Bloomerang</p>
          <p className="mt-2">v3.0.0 - Phase 3 Complete</p>
        </div>
      </div>
    </main>
  )
}
