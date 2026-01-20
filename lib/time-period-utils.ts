/**
 * Utility functions for time period calculations
 */

/**
 * Calculate the number of days between two dates (inclusive)
 */
export function calculateDaysDifference(
  startDate: string | null,
  endDate: string | null
): number | null {
  if (!startDate || !endDate) return null

  try {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end
    return diffDays
  } catch {
    return null
  }
}

/**
 * Find gaps between sorted periods
 * Returns array of missing date ranges
 */
export interface PeriodGap {
  gapStart: string
  gapEnd: string
  daysMissing: number
}

export function findMissingPeriods(
  periods: Array<{ start: string; end: string }>
): PeriodGap[] {
  if (periods.length < 2) return []

  // Sort periods by start date (ascending)
  const sorted = [...periods].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  const gaps: PeriodGap[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = new Date(sorted[i].end)
    const nextStart = new Date(sorted[i + 1].start)

    // Add one day to current end to get the day after
    const dayAfterCurrent = new Date(currentEnd)
    dayAfterCurrent.setDate(dayAfterCurrent.getDate() + 1)

    // Check if there's a gap (next period starts more than 1 day after current ends)
    if (nextStart.getTime() > dayAfterCurrent.getTime()) {
      const gapStart = dayAfterCurrent.toISOString().split('T')[0]
      const gapEnd = new Date(nextStart.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const daysMissing = calculateDaysDifference(gapStart, gapEnd) || 0

      gaps.push({
        gapStart,
        gapEnd,
        daysMissing
      })
    }
  }

  return gaps
}

/**
 * Check if a date is in the past (before today)
 */
export function isPastDate(dateString: string | null): boolean {
  if (!dateString) return false

  try {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return date.getTime() < today.getTime()
  } catch {
    return false
  }
}

/**
 * Check if a date is today or in the past
 */
export function isPastOrToday(dateString: string | null): boolean {
  if (!dateString) return false

  try {
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return date.getTime() <= today.getTime()
  } catch {
    return false
  }
}

/**
 * Format date as Swedish locale string
 */
export function formatDateSwedish(dateString: string | null): string {
  if (!dateString) return '-'

  try {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}
