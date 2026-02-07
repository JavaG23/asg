import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import crypto from 'crypto'
import prisma from '@/lib/database/client'
import { authOptions } from '@/lib/auth/config'
import { sendPasswordResetEmail } from '@/lib/services/email'

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

    const { driverIds } = await request.json()

    if (!driverIds || !Array.isArray(driverIds) || driverIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No drivers selected' },
        { status: 400 }
      )
    }

    // Get drivers without passwords
    const drivers = await prisma.user.findMany({
      where: {
        id: { in: driverIds },
        active: true,
        passwordHash: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (drivers.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No eligible drivers found (all may already have passwords)',
      })
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as { email: string; error: string }[],
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Send password setup emails to each driver
    for (const driver of drivers) {
      try {
        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex')
        const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for setup

        // Save token to user record
        await prisma.user.update({
          where: { id: driver.id },
          data: {
            passwordResetToken: token,
            passwordResetTokenExpiry: expiry,
          },
        })

        // Build reset URL
        const resetUrl = `${baseUrl}/reset-password?token=${token}`

        // Send email
        const emailResult = await sendPasswordResetEmail(driver.email, driver.name, resetUrl)

        if (emailResult.success) {
          results.sent++
        } else {
          results.failed++
          results.errors.push({ email: driver.email, error: emailResult.error || 'Unknown error' })
        }
      } catch (err) {
        results.failed++
        results.errors.push({ email: driver.email, error: 'Failed to process' })
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
      message: `Sent ${results.sent} email(s)${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
    })
  } catch (error) {
    console.error('Send password setup error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred while sending emails' },
      { status: 500 }
    )
  }
}
