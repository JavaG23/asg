import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import {
  sendFoodNotOutsideEmail,
  sendDonorReengagementEmail,
  sendVolunteerReengagementEmail,
} from '@/lib/services/email'

interface EmailRecipient {
  email: string
  name: string
}

interface VolunteerEmailRecipient extends EmailRecipient {
  upcomingShifts?: Array<{ date: string; time: string; location: string }>
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can send bulk emails
    if (!(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { type, recipients } = body as {
      type: 'food_not_outside' | 'reengagement' | 'thank_you' | 'volunteer_reengagement'
      recipients: EmailRecipient[]
    }

    if (!type || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'Missing required fields: type and recipients' },
        { status: 400 }
      )
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients provided' },
        { status: 400 }
      )
    }

    // Get upcoming pickup dates for donor emails
    const upcomingEvents = await prisma.pickupEvent.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      orderBy: { date: 'asc' },
      take: 5,
    })

    const upcomingDates = upcomingEvents.map((event) =>
      event.date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    )

    // Get upcoming shifts for volunteer emails
    const upcomingShifts = await prisma.volunteerShift.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      orderBy: { date: 'asc' },
      take: 5,
    })

    const upcomingShiftData = upcomingShifts.map((shift) => ({
      date: shift.date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      time: `${shift.startTime} - ${shift.endTime}`,
      location: shift.location,
    }))

    const results: { email: string; success: boolean; error?: string }[] = []

    for (const recipient of recipients) {
      if (!recipient.email) {
        results.push({ email: '', success: false, error: 'No email address' })
        continue
      }

      let result: { success: boolean; error?: string }

      switch (type) {
        case 'food_not_outside':
          result = await sendFoodNotOutsideEmail(
            recipient.email,
            recipient.name || 'Donor',
            upcomingDates
          )
          break

        case 'reengagement':
          result = await sendDonorReengagementEmail(
            recipient.email,
            recipient.name || 'Donor',
            upcomingDates
          )
          break

        case 'thank_you':
          // For now, we'll use the reengagement email as a template
          // This can be customized later with a dedicated thank you email
          result = await sendDonorReengagementEmail(
            recipient.email,
            recipient.name || 'Donor',
            upcomingDates
          )
          break

        case 'volunteer_reengagement':
          result = await sendVolunteerReengagementEmail(
            recipient.email,
            recipient.name || 'Volunteer',
            upcomingShiftData
          )
          break

        default:
          result = { success: false, error: 'Unknown email type' }
      }

      results.push({ email: recipient.email, ...result })
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      data: {
        sent: successCount,
        failed: failCount,
        results,
      },
    })
  } catch (error) {
    console.error('Error sending bulk email:', error)
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    )
  }
}
