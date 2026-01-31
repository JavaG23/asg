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

        // Return user object
        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token, user }) {
      if (session.user) {
        // For JWT strategy
        if (token) {
          (session.user as any).id = token.id as string
          (session.user as any).role = token.role as string
        }
        // For database strategy, fetch role from database
        if (user) {
          (session.user as any).id = user.id
          const dbUser = await prisma.user.findUnique({
            where: { id: parseInt(user.id) },
            select: { role: true }
          })
          if (dbUser) {
            (session.user as any).role = dbUser.role
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
