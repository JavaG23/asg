import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireVolunteer } from '@/lib/auth/guards'
import { sendContactOpportunityManagerEmail } from '@/lib/services/email'

// Volunteer portal build-out (#65)
// "Contact Manager" button on an opportunity card. Sends the volunteer's
// message to the opportunity type's manager via Resend (reply-to volunteer).
// Body: { opportunityTypeId: number, message: string }

const MAX_MESSAGE_LENGTH = 2000

export async function POST(request: NextRequest) {
  try {
    const auth = await requireVolunteer()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const opportunityTypeId = Number(body.opportunityTypeId)
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!Number.isInteger(opportunityTypeId) || !message) {
      return NextResponse.json(
        { success: false, error: 'opportunityTypeId and message are required' },
        { status: 400 }
      )
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Message must be under ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      )
    }

    const type = await prisma.opportunityType.findUnique({
      where: { id: opportunityTypeId },
    })

    if (!type || !type.active) {
      return NextResponse.json(
        { success: false, error: 'Opportunity not found' },
        { status: 404 }
      )
    }
    if (!type.managerEmail) {
      return NextResponse.json(
        { success: false, error: 'This opportunity does not have a contact manager configured' },
        { status: 400 }
      )
    }

    const result = await sendContactOpportunityManagerEmail(
      type.managerEmail,
      type.managerName || 'Opportunity Manager',
      type.name,
      auth.user.name,
      auth.user.email,
      message
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send message. Please try again later.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, data: { sent: true } })
  } catch (error) {
    console.error('Error contacting opportunity manager:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
