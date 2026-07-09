import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/database/client'
import { requireVolunteer } from '@/lib/auth/guards'

// 65j: community-partner registrations for kind='registration' opportunities
// (Food Drive Signup, Kit Packing Donations): planned delivery date + contact
// info, tracked with a status the admin advances in /admin/volunteers.

export async function GET() {
  try {
    const auth = await requireVolunteer()
    if ('error' in auth) return auth.error

    const registrations = await prisma.opportunityRegistration.findMany({
      where: { userId: auth.user.id },
      include: { opportunityType: { select: { id: true, name: true } } },
      orderBy: { plannedDate: 'desc' },
    })

    return NextResponse.json({ success: true, data: registrations })
  } catch (error) {
    console.error('Error fetching registrations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch registrations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireVolunteer()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const opportunityTypeId = Number(body.opportunityTypeId)
    const plannedDateStr = typeof body.plannedDate === 'string' ? body.plannedDate : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!Number.isInteger(opportunityTypeId) || !plannedDateStr) {
      return NextResponse.json(
        { success: false, error: 'opportunityTypeId and plannedDate are required' },
        { status: 400 }
      )
    }

    const type = await prisma.opportunityType.findUnique({ where: { id: opportunityTypeId } })
    if (!type || !type.active || type.kind !== 'registration') {
      return NextResponse.json(
        { success: false, error: 'This opportunity does not accept registrations' },
        { status: 400 }
      )
    }

    const plannedDate = new Date(plannedDateStr + 'T12:00:00Z')
    if (isNaN(plannedDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'plannedDate must be a valid date' },
        { status: 400 }
      )
    }

    const registration = await prisma.opportunityRegistration.create({
      data: {
        userId: auth.user.id,
        opportunityTypeId,
        plannedDate,
        phone: phone || null,
        message: message || null,
      },
      include: { opportunityType: { select: { id: true, name: true } } },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Registration submitted! The pantry will follow up to confirm.',
        data: registration,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating registration:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit registration' },
      { status: 500 }
    )
  }
}
