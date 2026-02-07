import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import crypto from 'crypto'
import { sendDonorWelcomeEmail, sendVolunteerWelcomeEmail } from '@/lib/services/email'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    const applications = await prisma.pendingOnboarding.findMany({
      where: {
        status: 'pending',
      },
      orderBy: {
        submittedAt: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: applications.map((app) => ({
        id: app.id,
        type: app.type,
        email: app.email,
        status: app.status,
        submittedAt: app.submittedAt.toISOString(),
        applicationData: JSON.parse(app.applicationData),
      })),
    })
  } catch (error) {
    console.error('Error fetching pending onboarding:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!adminUser?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { applicationId, action } = body

    if (!applicationId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      )
    }

    const application = await prisma.pendingOnboarding.findUnique({
      where: { id: applicationId },
    })

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Application already processed' },
        { status: 400 }
      )
    }

    if (action === 'reject') {
      await prisma.pendingOnboarding.update({
        where: { id: applicationId },
        data: {
          status: 'rejected',
          processedAt: new Date(),
          processedById: adminUser.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Application rejected',
      })
    }

    // Approve - create user and related records
    const appData = JSON.parse(application.applicationData)

    // Generate password reset token for initial setup
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    if (application.type === 'donor') {
      // Create user
      const newUser = await prisma.user.create({
        data: {
          name: appData.name,
          email: appData.email,
          phone: appData.phone || null,
          isAdmin: false,
          isDriver: false,
          isDonor: true,
          isVolunteer: false,
          passwordResetToken: resetToken,
          passwordResetTokenExpiry: resetExpiry,
        },
      })

      // Create donor record
      const donor = await prisma.donor.create({
        data: {
          userId: newUser.id,
          name: appData.name,
          email: appData.email,
          phone: appData.phone || null,
        },
      })

      // Create address if provided
      if (appData.streetAddress) {
        // We need a route to associate with - for donors, we'll create a placeholder
        // In a real system, you might handle this differently
        // For now, donors' addresses will be managed separately
      }

      // Update application status
      await prisma.pendingOnboarding.update({
        where: { id: applicationId },
        data: {
          status: 'approved',
          processedAt: new Date(),
          processedById: adminUser.id,
        },
      })

      // Send welcome email
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const passwordSetupUrl = `${baseUrl}/reset-password?token=${resetToken}`

      await sendDonorWelcomeEmail(appData.email, appData.name, passwordSetupUrl)

      return NextResponse.json({
        success: true,
        message: 'Donor approved and welcome email sent',
        data: { userId: newUser.id, donorId: donor.id },
      })
    } else if (application.type === 'volunteer') {
      // Create user
      const newUser = await prisma.user.create({
        data: {
          name: appData.name,
          email: appData.email,
          phone: appData.phone || null,
          isAdmin: false,
          isDriver: false,
          isDonor: false,
          isVolunteer: true,
          passwordResetToken: resetToken,
          passwordResetTokenExpiry: resetExpiry,
        },
      })

      // Update application status
      await prisma.pendingOnboarding.update({
        where: { id: applicationId },
        data: {
          status: 'approved',
          processedAt: new Date(),
          processedById: adminUser.id,
        },
      })

      // Send welcome email
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const passwordSetupUrl = `${baseUrl}/reset-password?token=${resetToken}`

      await sendVolunteerWelcomeEmail(appData.email, appData.name, passwordSetupUrl)

      return NextResponse.json({
        success: true,
        message: 'Volunteer approved and welcome email sent',
        data: { userId: newUser.id },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid application type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing application:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process application' },
      { status: 500 }
    )
  }
}
