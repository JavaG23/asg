import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/database/client'
import { sendPasswordResetEmail } from '@/lib/services/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      // Always return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Find user by email (case-insensitive)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // If user exists and is active, send reset email
    if (user && user.active) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex')
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

      // Save token to user record (invalidates any previous token)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetTokenExpiry: expiry,
        },
      })

      // Build reset URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const resetUrl = `${baseUrl}/reset-password?token=${token}`

      // Send email via Resend
      const emailResult = await sendPasswordResetEmail(user.email, user.name, resetUrl)

      if (!emailResult.success) {
        console.error('Failed to send password reset email:', emailResult.error)
        // Still return success to prevent enumeration, but log the error
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    // Return success even on error to prevent enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  }
}
