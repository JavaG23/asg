import prisma from '@/lib/database/client'

// 65j: keeps the "Driver Routes" volunteer opportunity in sync with the
// Route table. One VolunteerShift per date; spotsNeeded mirrors the number
// of routes on that date UNLESS an admin set the count manually (pre-planning
// scenario: "30 drivers needed Saturday" before routes exist) — manual counts
// are never overwritten by route creation/deletion.
//
// Callers MUST treat this as non-fatal (it is wrapped in its own try/catch
// and never throws) so existing route workflows keep working even if the
// volunteer tables are missing or the Driver Routes type isn't seeded.

const DRIVER_ROUTES_SLUG = 'driver-routes'
const DEFAULT_START = '08:00'
const DEFAULT_END = '12:00'
const DEFAULT_LOCATION = 'Assigned route — see driver portal'

function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function getDriverRoutesType() {
  return prisma.opportunityType.findUnique({ where: { slug: DRIVER_ROUTES_SLUG } })
}

// Find the synced shift for a date (matches any time-of-day on that date).
async function findShiftForDate(typeId: number, date: Date) {
  const dayStart = toUtcMidnight(date)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  return prisma.volunteerShift.findFirst({
    where: { opportunityTypeId: typeId, date: { gte: dayStart, lt: dayEnd } },
    include: { signups: { where: { status: { not: 'cancelled' } }, select: { id: true } } },
  })
}

export async function syncDriverRoutesShift(date: Date): Promise<void> {
  try {
    const type = await getDriverRoutesType()
    if (!type) return // Driver Routes type not seeded yet — nothing to sync

    const dayStart = toUtcMidnight(date)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const routeCount = await prisma.route.count({
      where: { date: { gte: dayStart, lt: dayEnd } },
    })

    const shift = await findShiftForDate(type.id, date)

    if (!shift) {
      if (routeCount > 0) {
        await prisma.volunteerShift.create({
          data: {
            date: new Date(dayStart.getTime() + 12 * 60 * 60 * 1000), // noon UTC, matches route/shift convention
            startTime: DEFAULT_START,
            endTime: DEFAULT_END,
            location: DEFAULT_LOCATION,
            spotsNeeded: routeCount,
            opportunityTypeId: type.id,
            spotsManuallySet: false,
            notes: 'Auto-created from driver routes',
          },
        })
      }
      return
    }

    // Admin pre-planned this date ("30 drivers needed") — never override.
    if (shift.spotsManuallySet) return

    if (routeCount === 0 && shift.signups.length === 0) {
      await prisma.volunteerShift.delete({ where: { id: shift.id } })
    } else if (shift.spotsNeeded !== routeCount) {
      await prisma.volunteerShift.update({
        where: { id: shift.id },
        data: { spotsNeeded: routeCount },
      })
    }
  } catch (error) {
    // Non-fatal by design: never let sync problems break route workflows
    console.error('driver-routes-sync: shift sync failed (non-fatal):', error)
  }
}

// 65j: auto-log volunteer hours when a driver completes all stops on a route.
// Deduped by routeId. Non-fatal like the sync above.
export async function logDriverRouteHours(routeId: number): Promise<void> {
  try {
    const route = await prisma.route.findUnique({ where: { id: routeId } })
    if (!route?.driverId) return

    const existing = await prisma.volunteerHourLog.findFirst({ where: { routeId } })
    if (existing) return

    const type = await getDriverRoutesType()
    const shift = type ? await findShiftForDate(type.id, route.date) : null

    const clockOut = new Date()
    const clockIn = route.startedAt ?? clockOut
    const totalMinutes = Math.max(0, Math.round((clockOut.getTime() - clockIn.getTime()) / 60000))

    await prisma.volunteerHourLog.create({
      data: {
        userId: route.driverId,
        shiftId: shift?.id ?? null,
        opportunityTypeId: type?.id ?? null,
        routeId,
        clockIn,
        clockOut,
        totalMinutes,
        source: 'route',
        verified: true, // system-generated from actual route completion
        notes: `Route: ${route.name}`,
      },
    })
  } catch (error) {
    console.error('driver-routes-sync: hour log failed (non-fatal):', error)
  }
}
