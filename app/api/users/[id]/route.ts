import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/database/client'
import { authOptions } from '@/lib/auth/config'
import { logFieldChanges, logChange } from '@/lib/services/changelog'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
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
        active: true,
        bloomerangId: true,
        createdAt: true,
        updatedAt: true,
        passwordHash: true,
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
    if (!session?.user || (session.user as any).role !== 'admin') {
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
    const { name, email, phone, role, active } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (role && !['driver', 'admin'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be "driver" or "admin"' },
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
    if (userId === currentUserId && role === 'driver') {
      return NextResponse.json(
        { success: false, error: 'You cannot remove your own admin privileges' },
        { status: 400 }
      )
    }

    // Get original user for change logging
    const originalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true, role: true, active: true },
    })

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        role: role || undefined,
        active: active !== undefined ? active : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        bloomerangId: true,
        createdAt: true,
        updatedAt: true,
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
          { field: 'role', oldValue: originalUser.role, newValue: updatedUser.role },
          { field: 'active', oldValue: originalUser.active, newValue: updatedUser.active },
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
    if (!session?.user || (session.user as any).role !== 'admin') {
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

    // Prevent deleting yourself
    const currentUserId = parseInt((session.user as any).id)
    if (userId === currentUserId) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get user info for logging
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, active: true },
    })

    // Soft delete by setting active to false, or hard delete
    // Using soft delete for safety
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
      entityName: user?.name,
      field: 'active',
      oldValue: user?.active,
      newValue: false,
    })

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
