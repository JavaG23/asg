'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { TruckIcon, Shield, Heart, Users, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

interface UserRoles {
  isAdmin: boolean
  isDriver: boolean
  isDonor: boolean
  isVolunteer: boolean
}

export default function SelectRolePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [roles, setRoles] = useState<UserRoles | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }

    if (session?.user) {
      const user = session.user as any
      const userRoles: UserRoles = {
        isAdmin: user.isAdmin ?? false,
        isDriver: user.isDriver ?? true, // Default true for backward compatibility
        isDonor: user.isDonor ?? false,
        isVolunteer: user.isVolunteer ?? false,
      }

      // Count active roles
      const roleCount = [userRoles.isAdmin, userRoles.isDriver, userRoles.isDonor, userRoles.isVolunteer]
        .filter(Boolean).length

      // If only one role, redirect directly
      if (roleCount <= 1) {
        if (userRoles.isAdmin) {
          router.replace('/admin/dashboard')
        } else if (userRoles.isDonor) {
          router.replace('/donor/dashboard')
        } else if (userRoles.isVolunteer) {
          router.replace('/volunteer/dashboard')
        } else {
          router.replace('/driver/dashboard')
        }
        return
      }

      setRoles(userRoles)
    }
  }, [status, session, router])

  const handleRoleSelect = (role: string) => {
    // Store selected role in sessionStorage for role switching
    sessionStorage.setItem('selectedRole', role)

    switch (role) {
      case 'admin':
        router.push('/admin/dashboard')
        break
      case 'driver':
        router.push('/driver/dashboard')
        break
      case 'donor':
        router.push('/donor/dashboard')
        break
      case 'volunteer':
        router.push('/volunteer/dashboard')
        break
    }
  }

  if (status === 'loading' || !roles) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    )
  }

  const userName = session?.user?.name || 'User'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <TruckIcon className="w-16 h-16 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {userName}
          </h1>
          <p className="text-gray-600">
            Choose which role to use
          </p>
        </div>

        {/* Role Selection Buttons */}
        <div className="space-y-4">
          {roles.isAdmin && (
            <button
              onClick={() => handleRoleSelect('admin')}
              className="w-full btn bg-purple-600 hover:bg-purple-700 text-white py-4 text-lg flex items-center justify-center gap-3"
            >
              <Shield className="w-6 h-6" />
              Continue as Admin
            </button>
          )}

          {roles.isDriver && (
            <button
              onClick={() => handleRoleSelect('driver')}
              className="w-full btn btn-primary py-4 text-lg flex items-center justify-center gap-3"
            >
              <TruckIcon className="w-6 h-6" />
              Continue as Driver
            </button>
          )}

          {roles.isDonor && (
            <button
              onClick={() => handleRoleSelect('donor')}
              className="w-full btn bg-red-500 hover:bg-red-600 text-white py-4 text-lg flex items-center justify-center gap-3"
            >
              <Heart className="w-6 h-6" />
              Continue as Donor
            </button>
          )}

          {roles.isVolunteer && (
            <button
              onClick={() => handleRoleSelect('volunteer')}
              className="w-full btn bg-green-600 hover:bg-green-700 text-white py-4 text-lg flex items-center justify-center gap-3"
            >
              <Users className="w-6 h-6" />
              Continue as Volunteer
            </button>
          )}
        </div>

        {/* Sign Out Option */}
        <div className="text-center pt-4">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2 mx-auto"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}
