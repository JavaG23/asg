import prisma from '@/lib/database/client'

// Volunteer portal build-out (#65): generates VolunteerShift rows from
// active RecurringShiftTemplate records. Called from
// POST /api/admin/recurring-shifts/generate and intended to also run
// as a daily cron once the feature ships (see vercel.json pattern for
// /api/cron/pickup-reminders).
//
// Idempotent: skips dates where a shift for the same template already exists.

interface GenerationResult {
  templatesProcessed: number
  shiftsCreated: number
  errors: string[]
}

function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// Weeks between two UTC-midnight dates (for biweekly cadence, anchored to startDate's week)
function weeksBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (7 * 24 * 60 * 60 * 1000))
}

export function datesForTemplate(template: {
  frequency: string
  daysOfWeek: string
  startDate: Date
  endDate: Date | null
  generateDaysAhead: number
}, from: Date = new Date()): Date[] {
  let days: number[]
  try {
    days = JSON.parse(template.daysOfWeek)
  } catch {
    return []
  }
  if (!Array.isArray(days) || days.length === 0) return []

  const start = toUtcMidnight(template.startDate)
  const windowStart = toUtcMidnight(from < template.startDate ? template.startDate : from)
  const windowEnd = new Date(windowStart.getTime() + template.generateDaysAhead * 24 * 60 * 60 * 1000)
  const hardEnd = template.endDate ? toUtcMidnight(template.endDate) : null

  const dates: Date[] = []
  for (let d = new Date(windowStart); d <= windowEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    if (hardEnd && d > hardEnd) break
    if (!days.includes(d.getUTCDay())) continue
    if (template.frequency === 'biweekly' && weeksBetween(start, d) % 2 !== 0) continue
    if (template.frequency === 'monthly') {
      // "monthly" = first occurrence of each listed weekday in the month
      if (d.getUTCDate() > 7) continue
    }
    dates.push(new Date(d))
  }
  return dates
}

export async function generateShiftsFromTemplates(): Promise<GenerationResult> {
  const result: GenerationResult = { templatesProcessed: 0, shiftsCreated: 0, errors: [] }

  const templates = await prisma.recurringShiftTemplate.findMany({
    where: { active: true },
  })

  for (const template of templates) {
    result.templatesProcessed++
    try {
      const dates = datesForTemplate(template)
      if (dates.length === 0) continue

      const existing = await prisma.volunteerShift.findMany({
        where: { templateId: template.id, date: { in: dates } },
        select: { date: true },
      })
      const existingTimes = new Set(existing.map((s) => s.date.getTime()))
      const toCreate = dates.filter((d) => !existingTimes.has(d.getTime()))

      if (toCreate.length > 0) {
        await prisma.volunteerShift.createMany({
          data: toCreate.map((date) => ({
            date,
            startTime: template.startTime,
            endTime: template.endTime,
            location: template.location,
            spotsNeeded: template.spotsNeeded,
            notes: template.notes,
            opportunityTypeId: template.opportunityTypeId,
            templateId: template.id,
          })),
        })
        result.shiftsCreated += toCreate.length
      }
    } catch (err) {
      result.errors.push(`Template ${template.id}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  return result
}
