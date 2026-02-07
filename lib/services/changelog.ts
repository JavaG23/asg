import prisma from '@/lib/database/client'

export type ChangeAction = 'create' | 'update' | 'delete' | 'import'
export type EntityType = 'user' | 'route' | 'address' | 'deliveryLog' | 'donor'

interface LogChangeParams {
  userId?: number | null
  userName?: string | null
  action: ChangeAction
  entityType: EntityType
  entityId: number
  entityName?: string | null
  field?: string | null
  oldValue?: unknown
  newValue?: unknown
  metadata?: Record<string, unknown>
}

/**
 * Log a change to the database for audit purposes
 */
export async function logChange(params: LogChangeParams): Promise<void> {
  try {
    await prisma.changeLog.create({
      data: {
        userId: params.userId ?? null,
        userName: params.userName ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName ?? null,
        field: params.field ?? null,
        oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
  } catch (error) {
    // Log error but don't throw - we don't want audit logging to break main operations
    console.error('Failed to log change:', error)
  }
}

/**
 * Log multiple field changes for a single entity update
 */
export async function logFieldChanges(params: {
  userId?: number | null
  userName?: string | null
  entityType: EntityType
  entityId: number
  entityName?: string | null
  changes: { field: string; oldValue: unknown; newValue: unknown }[]
}): Promise<void> {
  const { userId, userName, entityType, entityId, entityName, changes } = params

  // Filter out unchanged fields
  const actualChanges = changes.filter(
    (c) => JSON.stringify(c.oldValue) !== JSON.stringify(c.newValue)
  )

  if (actualChanges.length === 0) return

  try {
    await prisma.changeLog.createMany({
      data: actualChanges.map((change) => ({
        userId: userId ?? null,
        userName: userName ?? null,
        action: 'update' as const,
        entityType,
        entityId,
        entityName: entityName ?? null,
        field: change.field,
        oldValue: change.oldValue !== undefined ? JSON.stringify(change.oldValue) : null,
        newValue: change.newValue !== undefined ? JSON.stringify(change.newValue) : null,
      })),
    })
  } catch (error) {
    console.error('Failed to log field changes:', error)
  }
}

/**
 * Get change logs with pagination and filtering
 */
export async function getChangeLogs(params: {
  entityType?: EntityType
  entityId?: number
  userId?: number
  action?: ChangeAction
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<{
  logs: Array<{
    id: number
    userId: number | null
    userName: string | null
    action: string
    entityType: string
    entityId: number
    entityName: string | null
    field: string | null
    oldValue: string | null
    newValue: string | null
    metadata: string | null
    createdAt: Date
  }>
  total: number
}> {
  const where: Record<string, unknown> = {}

  if (params.entityType) where.entityType = params.entityType
  if (params.entityId) where.entityId = params.entityId
  if (params.userId) where.userId = params.userId
  if (params.action) where.action = params.action
  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) (where.createdAt as Record<string, Date>).gte = params.startDate
    if (params.endDate) (where.createdAt as Record<string, Date>).lte = params.endDate
  }

  const [logs, total] = await Promise.all([
    prisma.changeLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
    }),
    prisma.changeLog.count({ where }),
  ])

  return { logs, total }
}
