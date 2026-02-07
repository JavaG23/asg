import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import crypto from 'crypto'
import prisma from '@/lib/database/client'
import { authOptions } from '@/lib/auth/config'
import { sendRouteAssignmentEmail } from '@/lib/services/email'

export async function POST(request: Request) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { routeId, driverId } = await request.json()

    if (!routeId || !driverId) {
      return NextResponse.json(
        { success: false, error: 'Route ID and driver ID are required' },
        { status: 400 }
      )
    }

    // Get route with addresses
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        addresses: true,
      },
    })

    if (!route) {
      return NextResponse.json(
        { success: false, error: 'Route not found' },
        { status: 404 }
      )
    }

    // Get driver
    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        active: true,
      },
    })

    if (!driver || !driver.active) {
      return NextResponse.json(
        { success: false, error: 'Driver not found or inactive' },
        { status: 404 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const loginUrl = `${baseUrl}/login`
    const hasPassword = !!driver.passwordHash

    let passwordResetUrl: string | undefined

    // If driver doesn't have a password, generate a setup token
    if (!hasPassword) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      await prisma.user.update({
        where: { id: driver.id },
        data: {
          passwordResetToken: token,
          passwordResetTokenExpiry: expiry,
        },
      })

      passwordResetUrl = `${baseUrl}/reset-password?token=${token}`
    }

    // Format route date
    const routeDate = new Date(route.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Send the email
    const emailResult = await sendRouteAssignmentEmail(
      driver.email,
      driver.name,
      route.name,
      routeDate,
      route.addresses.length,
      loginUrl,
      hasPassword,
      passwordResetUrl
    )

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Failed to send email',
      })
    }

    return NextResponse.json({
      success: true,
      message: `Route assignment email sent to ${driver.email}`,
    })
  } catch (error) {
    console.error('Send route assignment email error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred while sending email' },
      { status: 500 }
    )
  }
}
