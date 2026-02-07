import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, streetAddress, city, state, zipCode, notes } = body

    // Validate required fields
    if (!name || !email || !streetAddress || !city || !state || !zipCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email already exists in pending onboarding
    const existingPending = await prisma.pendingOnboarding.findUnique({
      where: { email },
    })

    if (existingPending) {
      if (existingPending.status === 'pending') {
        return NextResponse.json(
          { success: false, error: 'An application with this email is already pending review' },
          { status: 400 }
        )
      }
      // If rejected, allow resubmission by deleting old record
      if (existingPending.status === 'rejected') {
        await prisma.pendingOnboarding.delete({
          where: { id: existingPending.id },
        })
      }
    }

    // Check if email already exists as a user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists. Please sign in instead.' },
        { status: 400 }
      )
    }

    // Check if email already exists as a donor
    const existingDonor = await prisma.donor.findUnique({
      where: { email },
    })

    if (existingDonor) {
      return NextResponse.json(
        { success: false, error: 'This email is already registered as a donor. Please contact us for assistance.' },
        { status: 400 }
      )
    }

    // Create pending onboarding record
    const applicationData = {
      name,
      email,
      phone: phone || null,
      streetAddress,
      city,
      state,
      zipCode,
      notes: notes || null,
    }

    await prisma.pendingOnboarding.create({
      data: {
        type: 'donor',
        email,
        applicationData: JSON.stringify(applicationData),
        status: 'pending',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
    })
  } catch (error) {
    console.error('Error creating donor application:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
