import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { sendPickupReminderEmail } from '@/lib/services/email'

/**
 * GET /api/cron/pickup-reminders
 *
 * Cron job that runs daily at 8 AM to send pickup reminders.
 * Sends reminders to donors who have opted in to events based on their
 * reminder preference (24h or 48h before the event).
 *
 * This endpoint is called by Vercel Cron Jobs.
 *
 * IMPORTANT: Reminders are DISABLED by default.
 * Set ENABLE_EMAIL_REMINDERS=true in environment variables to enable.
 */
export async function GET(request: NextRequest) {
  try {
    // Check if reminders are enabled (disabled by default for safety during testing)
    if (process.env.ENABLE_EMAIL_REMINDERS !== 'true') {
      console.log('Pickup reminders are disabled. Set ENABLE_EMAIL_REMINDERS=true to enable.')
      return NextResponse.json({
        success: true,
        message: 'Reminders are disabled. Set ENABLE_EMAIL_REMINDERS=true to enable.',
        sent: 0,
        skipped: true,
      })
    }

    // Verify cron secret in production
    const authHeader = request.headers.get('authorization')
    if (process.env.NODE_ENV === 'production') {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const dayAfterTomorrow = new Date(now)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
    dayAfterTomorrow.setHours(0, 0, 0, 0)

    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)

    const dayAfterEnd = new Date(dayAfterTomorrow)
    dayAfterEnd.setHours(23, 59, 59, 999)

    // Get opt-ins for tomorrow (24h reminder) where reminder not sent
    const tomorrowOptIns = await prisma.donorEventOptIn.findMany({
      where: {
        status: 'opted_in',
        reminderPreference: '24h',
        reminderSentAt: null,
        event: {
          date: {
            gte: tomorrow,
            lte: tomorrowEnd,
          },
        },
      },
      include: {
        donor: {
          include: {
            user: true,
            addresses: {
              take: 1,
            },
          },
        },
        event: true,
      },
    })

    // Get opt-ins for day after tomorrow (48h reminder) where reminder not sent
    const dayAfterOptIns = await prisma.donorEventOptIn.findMany({
      where: {
        status: 'opted_in',
        reminderPreference: '48h',
        reminderSentAt: null,
        event: {
          date: {
            gte: dayAfterTomorrow,
            lte: dayAfterEnd,
          },
        },
      },
      include: {
        donor: {
          include: {
            user: true,
            addresses: {
              take: 1,
            },
          },
        },
        event: true,
      },
    })

    const allOptIns = [...tomorrowOptIns, ...dayAfterOptIns]

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const optIn of allOptIns) {
      const email = optIn.donor.email || optIn.donor.user?.email
      const name = optIn.donor.name || optIn.donor.user?.name || 'Donor'

      if (!email) {
        errors.push(`No email for donor ID ${optIn.donorId}`)
        failed++
        continue
      }

      // Get address for the reminder email
      const address = optIn.donor.addresses[0]
      const addressStr = address
        ? `${address.streetAddress}, ${address.city}, ${address.state} ${address.zipCode}`
        : 'Your registered address'

      // Format date for email
      const eventDate = new Date(optIn.event.date)
      const dateStr = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      // Build cancel URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const cancelUrl = `${baseUrl}/donor/pickups`

      try {
        const result = await sendPickupReminderEmail(
          email,
          name,
          dateStr,
          addressStr,
          cancelUrl
        )

        if (result.success) {
          // Update reminderSentAt
          await prisma.donorEventOptIn.update({
            where: { id: optIn.id },
            data: { reminderSentAt: new Date() },
          })
          sent++
        } else {
          errors.push(`Failed to send to ${email}: ${result.error}`)
          failed++
        }
      } catch (err) {
        errors.push(`Error sending to ${email}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        failed++
      }
    }

    console.log(`Pickup reminders sent: ${sent}, failed: ${failed}`)
    if (errors.length > 0) {
      console.error('Reminder errors:', errors)
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${allOptIns.length} opt-ins`,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in pickup reminders cron:', error)
    return NextResponse.json(
      { error: 'Failed to process pickup reminders' },
      { status: 500 }
    )
  }
}
