'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { User, Mail, Hash, Key, Shield, Truck, Heart, Users, ArrowRightLeft } from 'lucide-react'
import { Loading } from '@/components/shared/Loading'
import { Card, CardContent } from '@/components/shared/Card'

export default function AdminProfile() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      setLoading(false)
    }
  }, [status, router])

  // Format user ID as "USR-00042"
  const formatUserId = (id: number) => `USR-${id.toString().padStart(5, '0')}`
  const userId = session?.user ? parseInt((session.user as any).id) : null
  const user = session?.user as any

  // Check if user has multiple roles
  const roles = {
    isAdmin: user?.isAdmin ?? false,
    isDriver: user?.isDriver ?? false,
    isDonor: user?.isDonor ?? false,
    isVolunteer: user?.isVolunteer ?? false,
  }
  const roleCount = Object.values(roles).filter(Boolean).length
  const hasMultipleRoles = roleCount > 1

  if (status === 'loading' || loading) {
    return <Loading text="Loading profile..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">View and manage your account</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info Card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Account Information
            </h2>

            <div className="space-y-3">
              {userId && (
                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                  <Hash className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-500">User ID</p>
                    <p className="font-mono font-medium text-primary-700">
                      {formatUserId(userId)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">
                    {session?.user?.name || 'Admin'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">
                    {session?.user?.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push('/forgot-password')}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <Key className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Change Password</p>
                  <p className="text-xs text-gray-500">Update your login password</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Roles Card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Roles
            </h2>

            <div className="space-y-2">
              {roles.isAdmin && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-700">Admin</p>
                    <p className="text-xs text-gray-500">Full system access</p>
                  </div>
                </div>
              )}
              {roles.isDriver && (
                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                  <Truck className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="font-medium text-primary-700">Driver</p>
                    <p className="text-xs text-gray-500">Food pickup routes</p>
                  </div>
                </div>
              )}
              {roles.isDonor && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <Heart className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-700">Donor</p>
                    <p className="text-xs text-gray-500">Food donation</p>
                  </div>
                </div>
              )}
              {roles.isVolunteer && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700">Volunteer</p>
                    <p className="text-xs text-gray-500">Hour tracking</p>
                  </div>
                </div>
              )}
            </div>

            {/* Switch Role Button */}
            {hasMultipleRoles && (
              <button
                onClick={() => router.push('/select-role')}
                className="w-full flex items-center justify-center gap-2 p-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors mt-4"
              >
                <ArrowRightLeft className="w-5 h-5" />
                Switch Role
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
