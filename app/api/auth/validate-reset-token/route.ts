import { NextResponse } from 'next/server'
import prisma from '@/lib/database/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ valid: false })
    }

    // Find user by token
    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
      select: {
        email: true,
        passwordResetTokenExpiry: true,
      },
    })

    if (!user) {
      return NextResponse.json({ valid: false })
    }

    // Check if token is expired
    if (!user.passwordResetTokenExpiry || user.passwordResetTokenExpiry < new Date()) {
      return NextResponse.json({ valid: false, expired: true })
    }

    // Return valid with partially masked email
    const emailParts = user.email.split('@')
    const maskedEmail =
      emailParts[0].substring(0, 2) +
      '***' +
      '@' +
      emailParts[1]

    return NextResponse.json({
      valid: true,
      email: maskedEmail,
    })
  } catch (error) {
    console.error('Validate reset token error:', error)
    return NextResponse.json({ valid: false })
  }
}
