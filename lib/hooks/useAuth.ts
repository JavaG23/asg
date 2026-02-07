'use client'

import { useSession } from 'next-auth/react'

export function useAuth() {
  const { data: session, status } = useSession()
  const user = session?.user as any

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    // Boolean role fields (preferred)
    isAdmin: user?.isAdmin ?? false,
    isDriver: user?.isDriver ?? false,
    isDonor: user?.isDonor ?? false,
    isVolunteer: user?.isVolunteer ?? false,
    // Helper to check if user has multiple roles
    hasMultipleRoles: [user?.isAdmin, user?.isDriver, user?.isDonor, user?.isVolunteer].filter(Boolean).length > 1,
  }
}
