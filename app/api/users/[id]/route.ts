import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/database/client'
import { authOptions } from '@/lib/auth/config'
import { logFieldChanges, logChange } from '@/lib/services/changelog'
import { geocodeAddress } from '@/lib/services/geocoding'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isAdmin: true,
        isDriver: true,
        isDonor: true,
        isVolunteer: true,
        active: true,
        bloomerangId: true,
        createdAt: true,
        updatedAt: true,
        passwordHash: true,
        homeStreet: true,
        homeCity: true,
        homeState: true,
        homeZip: true,
        homeLatitude: true,
        homeLongitude: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Don't send actual hash, just whether they have one
    const { passwordHash, ...userWithoutHash } = user

    return NextResponse.json({
      success: true,
      data: {
        ...userWithoutHash,
        hasPassword: !!passwordHash,
      },
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, email, phone, role, isAdmin, isDriver, isDonor, isVolunteer, active, homeStreet, homeCity, homeState, homeZip } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Validate at least one role is selected
    if (isAdmin === false && isDriver === false && isDonor === false && isVolunteer === false) {
      return NextResponse.json(
        { success: false, error: 'User must have at least one role' },
        { status: 400 }
      )
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        id: { not: userId },
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email is already in use by another user' },
        { status: 400 }
      )
    }

    // Prevent deactivating yourself
    const currentUserId = parseInt((session.user as any).id)
    if (userId === currentUserId && active === false) {
      return NextResponse.json(
        { success: false, error: 'You cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Prevent removing your own admin role
    if (userId === currentUserId && isAdmin === false) {
      return NextResponse.json(
        { success: false, error: 'You cannot remove your own admin privileges' },
        { status: 400 }
      )
    }

    // Get original user for change logging
    const originalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true, role: true, isAdmin: true, isDriver: true, isDonor: true, isVolunteer: true, active: true, homeStreet: true, homeCity: true, homeState: true, homeZip: true, homeLatitude: true, homeLongitude: true },
    })

    // Determine the primary role for backward compatibility
    const primaryRole = isAdmin ? 'admin' : 'driver'

    // Geocode home address if provided
    let homeLatitude: number | null = originalUser?.homeLatitude ?? null
    let homeLongitude: number | null = originalUser?.homeLongitude ?? null

    const hasHomeAddress = homeStreet && homeCity && homeState && homeZip
    const homeAddressChanged = hasHomeAddress && (
      homeStreet !== originalUser?.homeStreet ||
      homeCity !== originalUser?.homeCity ||
      homeState !== originalUser?.homeState ||
      homeZip !== originalUser?.homeZip
    )

    if (homeAddressChanged) {
      const geocodeResult = await geocodeAddress(homeStreet, homeCity, homeState, homeZip)
      if (geocodeResult) {
        homeLatitude = geocodeResult.latitude
        homeLongitude = geocodeResult.longitude
      }
    } else if (!hasHomeAddress) {
      // Clear coordinates if address is cleared
      homeLatitude = null
      homeLongitude = null
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        role: primaryRole, // Keep role field in sync for backward compatibility
        isAdmin: isAdmin !== undefined ? isAdmin : undefined,
        isDriver: isDriver !== undefined ? isDriver : undefined,
        isDonor: isDonor !== undefined ? isDonor : undefined,
        isVolunteer: isVolunteer !== undefined ? isVolunteer : undefined,
        active: active !== undefined ? active : undefined,
        homeStreet: homeStreet || null,
        homeCity: homeCity || null,
        homeState: homeState || null,
        homeZip: homeZip || null,
        homeLatitude,
        homeLongitude,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isAdmin: true,
        isDriver: true,
        isDonor: true,
        isVolunteer: true,
        active: true,
        bloomerangId: true,
        createdAt: true,
        updatedAt: true,
        homeStreet: true,
        homeCity: true,
        homeState: true,
        homeZip: true,
        homeLatitude: true,
        homeLongitude: true,
      },
    })

    // Log changes
    if (originalUser) {
      await logFieldChanges({
        userId: currentUserId,
        userName: (session.user as any).name,
        entityType: 'user',
        entityId: userId,
        entityName: updatedUser.name,
        changes: [
          { field: 'name', oldValue: originalUser.name, newValue: updatedUser.name },
          { field: 'email', oldValue: originalUser.email, newValue: updatedUser.email },
          { field: 'phone', oldValue: originalUser.phone, newValue: updatedUser.phone },
          { field: 'isAdmin', oldValue: originalUser.isAdmin, newValue: updatedUser.isAdmin },
          { field: 'isDriver', oldValue: originalUser.isDriver, newValue: updatedUser.isDriver },
          { field: 'isDonor', oldValue: originalUser.isDonor, newValue: updatedUser.isDonor },
          { field: 'isVolunteer', oldValue: originalUser.isVolunteer, newValue: updatedUser.isVolunteer },
          { field: 'active', oldValue: originalUser.active, newValue: updatedUser.active },
          { field: 'homeStreet', oldValue: originalUser.homeStreet, newValue: updatedUser.homeStreet },
          { field: 'homeCity', oldValue: originalUser.homeCity, newValue: updatedUser.homeCity },
          { field: 'homeState', oldValue: originalUser.homeState, newValue: updatedUser.homeState },
          { field: 'homeZip', oldValue: originalUser.homeZip, newValue: updatedUser.homeZip },
        ],
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Check for hard delete parameter
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    // Prevent deleting yourself
    const currentUserId = parseInt((session.user as any).id)
    if (userId === currentUserId) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get complete user data for backup
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        routes: {
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
            addressId: true,
            completedAt: true,
            notes: true,
          },
        },
        sessions: {
          select: { id: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (hardDelete) {
      // Save complete user data to changelog for potential restoration
      const { passwordHash, passwordResetToken, passwordResetTokenExpiry, ...userDataToLog } = user

      await logChange({
        userId: currentUserId,
        userName: (session.user as any).name,
        action: 'delete',
        entityType: 'user',
        entityId: userId,
        entityName: user.name,
        field: null,
        oldValue: JSON.stringify(userDataToLog),
        newValue: null,
        metadata: {
          deleteType: 'hard',
          routeCount: user.routes.length,
          deliveryLogCount: user.deliveryLogs.length,
          restorable: true,
        },
      })

      // Clear route assignments (set driverId to null)
      await prisma.route.updateMany({
        where: { driverId: userId },
        data: { driverId: null },
      })

      // Delete sessions
      await prisma.session.deleteMany({
        where: { userId },
      })

      // Delete the user (delivery logs will be orphaned but kept for history)
      await prisma.user.delete({
        where: { id: userId },
      })

      return NextResponse.json({
        success: true,
        message: 'User permanently deleted. Data saved to changelog for potential restoration.',
      })
    } else {
      // Soft delete by setting active to false
      await prisma.user.update({
        where: { id: userId },
        data: { active: false },
      })

      // Log the deactivation
      await logChange({
        userId: currentUserId,
        userName: (session.user as any).name,
        action: 'update',
        entityType: 'user',
        entityId: userId,
        entityName: user.name,
        field: 'active',
        oldValue: String(user.active),
        newValue: 'false',
      })

      return NextResponse.json({
        success: true,
        message: 'User deactivated successfully',
      })
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
