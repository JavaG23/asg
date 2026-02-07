import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import prisma from '@/lib/database/client'
import { logFieldChanges } from '@/lib/services/changelog'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return { error: NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 }) }
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.isAdmin) {
    return { error: NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 }) }
  }
  return { user }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth && auth.error) return auth.error

    const { id } = await params
    const donorId = parseInt(id)

    if (isNaN(donorId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid donor ID' },
        { status: 400 }
      )
    }

    const donor = await prisma.donor.findUnique({
      where: { id: donorId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
          },
        },
        addresses: {
          include: {
            route: {
              select: {
                id: true,
                name: true,
                date: true,
                status: true,
              },
            },
            deliveryLogs: {
              select: {
                id: true,
                completedAt: true,
                notes: true,
              },
            },
          },
          orderBy: {
            route: {
              date: 'desc',
            },
          },
        },
      },
    })

    if (!donor) {
      return NextResponse.json(
        { success: false, error: 'Donor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: donor,
    })
  } catch (error) {
    console.error('Error fetching donor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch donor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth && auth.error) return auth.error

    const { id } = await params
    const donorId = parseInt(id)

    if (isNaN(donorId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid donor ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, email, phone, userId, adminUserId } = body

    // Get current donor for comparison
    const currentDonor = await prisma.donor.findUnique({
      where: { id: donorId },
    })

    if (!currentDonor) {
      return NextResponse.json(
        { success: false, error: 'Donor not found' },
        { status: 404 }
      )
    }

    // Check for duplicate email (excluding current donor)
    if (email && email.toLowerCase() !== currentDonor.email?.toLowerCase()) {
      const existingDonor = await prisma.donor.findUnique({
        where: { email: email.toLowerCase() },
      })
      if (existingDonor) {
        return NextResponse.json(
          { success: false, error: 'A donor with this email already exists' },
          { status: 400 }
        )
      }
    }

    const updatedDonor = await prisma.donor.update({
      where: { id: donorId },
      data: {
        name: name !== undefined ? name : currentDonor.name,
        email: email !== undefined ? email?.toLowerCase() || null : currentDonor.email,
        phone: phone !== undefined ? phone || null : currentDonor.phone,
        userId: userId !== undefined ? userId : currentDonor.userId,
      },
    })

    // Log changes
    await logFieldChanges({
      userId: adminUserId || null,
      entityType: 'donor',
      entityId: donorId,
      entityName: currentDonor.name,
      changes: [
        { field: 'name', oldValue: currentDonor.name, newValue: updatedDonor.name },
        { field: 'email', oldValue: currentDonor.email, newValue: updatedDonor.email },
        { field: 'phone', oldValue: currentDonor.phone, newValue: updatedDonor.phone },
        { field: 'userId', oldValue: currentDonor.userId?.toString() || null, newValue: updatedDonor.userId?.toString() || null },
      ],
    })

    return NextResponse.json({
      success: true,
      data: updatedDonor,
    })
  } catch (error) {
    console.error('Error updating donor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update donor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth && auth.error) return auth.error

    const { id } = await params
    const donorId = parseInt(id)

    if (isNaN(donorId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid donor ID' },
        { status: 400 }
      )
    }

    const donor = await prisma.donor.findUnique({
      where: { id: donorId },
      include: {
        addresses: true,
      },
    })

    if (!donor) {
      return NextResponse.json(
        { success: false, error: 'Donor not found' },
        { status: 404 }
      )
    }

    // Check if donor has addresses associated
    if (donor.addresses.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete donor with associated addresses. Remove addresses first or set them to a different donor.',
        },
        { status: 400 }
      )
    }

    await prisma.donor.delete({
      where: { id: donorId },
    })

    return NextResponse.json({
      success: true,
      message: 'Donor deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting donor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete donor' },
      { status: 500 }
    )
  }
}
