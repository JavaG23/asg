import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'

// Shared route guards for the volunteer portal build-out (#65).
// Replaces the copy-pasted session/role check block in each API route.
// Usage:
//   const auth = await requireAdmin()
//   if ('error' in auth) return auth.error
//   const { user } = auth

type GuardSuccess = {
  user: {
    id: number
    email: string
    name: string
    isAdmin: boolean
    isDriver: boolean
    isDonor: boolean
    isVolunteer: boolean
  }
}
type GuardFailure = { error: NextResponse }
type GuardResult = GuardSuccess | GuardFailure

async function requireRole(check: (u: GuardSuccess['user']) => boolean, label: string): Promise<GuardResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      isDriver: true,
      isDonor: true,
      isVolunteer: true,
      active: true,
    },
  })

  if (!user || !user.active || !check(user)) {
    return { error: NextResponse.json({ error: `${label} access required` }, { status: 403 }) }
  }

  return { user }
}

export async function requireAdmin(): Promise<GuardResult> {
  return requireRole((u) => u.isAdmin, 'Admin')
}

export async function requireVolunteer(): Promise<GuardResult> {
  // Admins may also access volunteer endpoints (useful for testing/support)
  return requireRole((u) => u.isVolunteer || u.isAdmin, 'Volunteer')
}
