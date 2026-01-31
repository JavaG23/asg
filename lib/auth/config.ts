import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
// import bcrypt from 'bcrypt'  // UNCOMMENT AFTER MIGRATION
import prisma from '@/lib/database/client'

export const authOptions: NextAuthOptions = {
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

        // TODO: Enable password verification after running migration:
        //   npx prisma migrate dev --name add_password_hash
        // Then uncomment passwordHash in schema.prisma and the bcrypt code below:
        //
        // if (user.passwordHash) {
        //   if (!credentials.password) return null
        //   const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        //   if (!isValid) return null
        // }

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
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        (session.user as any).role = token.role as string
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
