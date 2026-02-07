import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { Adapter } from 'next-auth/adapters'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/database/client'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'driver@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null
        }

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user || !user.active) {
          return null
        }

        // Password verification for users with passwordHash set
        if (user.passwordHash) {
          if (!credentials.password) return null
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!isValid) return null
        }

        // Return user object with role booleans
        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role, // Keep for backward compatibility
          isAdmin: user.isAdmin,
          isDriver: user.isDriver,
          isDonor: user.isDonor,
          isVolunteer: user.isVolunteer,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.isAdmin = (user as any).isAdmin
        token.isDriver = (user as any).isDriver
        token.isDonor = (user as any).isDonor
        token.isVolunteer = (user as any).isVolunteer
      }
      return token
    },
    async session({ session, token, user }) {
      if (session.user) {
        // For JWT strategy
        if (token) {
          (session.user as any).id = token.id as string
          (session.user as any).role = token.role as string
          (session.user as any).isAdmin = token.isAdmin as boolean
          (session.user as any).isDriver = token.isDriver as boolean
          (session.user as any).isDonor = token.isDonor as boolean
          (session.user as any).isVolunteer = token.isVolunteer as boolean
        }
        // For database strategy, fetch roles from database
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sessionUser = session.user as any
          sessionUser.id = user.id
          const dbUser = await prisma.user.findUnique({
            where: { id: parseInt(user.id) },
            select: { role: true, isAdmin: true, isDriver: true, isDonor: true, isVolunteer: true }
          })
          if (dbUser) {
            const roleStr = String(dbUser.role)
            sessionUser.role = roleStr
            sessionUser.isAdmin = Boolean(dbUser.isAdmin)
            sessionUser.isDriver = Boolean(dbUser.isDriver)
            sessionUser.isDonor = Boolean(dbUser.isDonor)
            sessionUser.isVolunteer = Boolean(dbUser.isVolunteer)
          }
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 365 * 24 * 60 * 60, // 1 year - effectively indefinite for PWA
  },
  secret: process.env.NEXTAUTH_SECRET,
}
