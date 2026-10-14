export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'
export const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy'
export const DEFAULT_TIME_FORMAT = 'HH:mm'
export const DEFAULT_WEEK_STARTS_ON = 'monday'

export const TIMEZONE_OPTIONS = [
  { label: 'Asia/Ho_Chi_Minh (UTC+07:00)', value: 'Asia/Ho_Chi_Minh' },
  { label: 'Asia/Bangkok (UTC+07:00)', value: 'Asia/Bangkok' },
  { label: 'Asia/Singapore (UTC+08:00)', value: 'Asia/Singapore' },
  { label: 'Asia/Tokyo (UTC+09:00)', value: 'Asia/Tokyo' },
  { label: 'UTC (UTC+00:00)', value: 'UTC' },
  { label: 'Europe/London (UTC+00:00 / UTC+01:00)', value: 'Europe/London' },
  { label: 'Europe/Paris (UTC+01:00 / UTC+02:00)', value: 'Europe/Paris' },
  { label: 'America/New_York (UTC-05:00 / UTC-04:00)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (UTC-08:00 / UTC-07:00)', value: 'America/Los_Angeles' },
]

export const DATE_FORMAT_OPTIONS = [
  { label: 'dd/MM/yyyy (e.g. 14/10/2026)', value: 'dd/MM/yyyy' },
  { label: 'yyyy-MM-dd (e.g. 2026-10-14)', value: 'yyyy-MM-dd' },
  { label: 'MM/dd/yyyy (e.g. 10/14/2026)', value: 'MM/dd/yyyy' },
  { label: 'd MMMM yyyy (e.g. 14 October 2026)', value: 'd MMMM yyyy' },
]

export const TIME_FORMAT_OPTIONS = [
  { label: '24-hour: HH:mm (e.g. 14:30)', value: 'HH:mm' },
  { label: '12-hour: hh:mm a (e.g. 02:30 PM)', value: 'hh:mm a' },
  { label: '24-hour with seconds: HH:mm:ss (e.g. 14:30:00)', value: 'HH:mm:ss' },
  { label: '12-hour with seconds: hh:mm:ss a (e.g. 02:30:00 PM)', value: 'hh:mm:ss a' },
]

export const WEEK_STARTS_ON_OPTIONS = [
  { label: 'Monday', value: 'monday' },
  { label: 'Sunday', value: 'sunday' },
  { label: 'Saturday', value: 'saturday' },
]

export type FormatDateTimeOptions = {
  timezone?: string
  dateFormat?: string
  timeFormat?: string
  locale?: string
}

function getPartsInTimezone(date: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }
  return map
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function formatDate(dateInput: Date | string | number, options?: FormatDateTimeOptions): string {
  const date = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(date.getTime())) return ''

  const timezone = options?.timezone || DEFAULT_TIMEZONE
  const format = options?.dateFormat || DEFAULT_DATE_FORMAT

  try {
    const parts = getPartsInTimezone(date, timezone)
    const year = parts.year || '1970'
    const monthNum = parts.month || '01'
    const day = parts.day || '01'
    const daySingle = String(parseInt(day, 10))
    const monthIndex = parseInt(monthNum, 10) - 1
    const monthName = MONTH_NAMES_EN[monthIndex] || monthNum

    switch (format) {
      case 'dd/MM/yyyy':
        return `${day}/${monthNum}/${year}`
      case 'yyyy-MM-dd':
        return `${year}-${monthNum}-${day}`
      case 'MM/dd/yyyy':
        return `${monthNum}/${day}/${year}`
      case 'd MMMM yyyy':
        return `${daySingle} ${monthName} ${year}`
      default:
        return `${day}/${monthNum}/${year}`
    }
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

export function formatTime(dateInput: Date | string | number, options?: FormatDateTimeOptions): string {
  const date = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(date.getTime())) return ''

  const timezone = options?.timezone || DEFAULT_TIMEZONE
  const format = options?.timeFormat || DEFAULT_TIME_FORMAT

  try {
    const parts = getPartsInTimezone(date, timezone)
    const hour24 = parseInt(parts.hour || '0', 10)
    const minute = parts.minute || '00'
    const second = parts.second || '00'

    const hour12Num = hour24 % 12 || 12
    const hour12 = hour12Num < 10 ? `0${hour12Num}` : String(hour12Num)
    const period = hour24 >= 12 ? 'PM' : 'AM'
    const hour24Str = hour24 < 10 ? `0${hour24}` : String(hour24)

    switch (format) {
      case 'HH:mm':
        return `${hour24Str}:${minute}`
      case 'hh:mm a':
        return `${hour12}:${minute} ${period}`
      case 'HH:mm:ss':
        return `${hour24Str}:${minute}:${second}`
      case 'hh:mm:ss a':
        return `${hour12}:${minute}:${second} ${period}`
      default:
        return `${hour24Str}:${minute}`
    }
  } catch {
    return date.toTimeString().slice(0, 5)
  }
}

export function formatDateTime(dateInput: Date | string | number, options?: FormatDateTimeOptions): string {
  const dateStr = formatDate(dateInput, options)
  const timeStr = formatTime(dateInput, options)
  if (!dateStr && !timeStr) return ''
  if (!timeStr) return dateStr
  if (!dateStr) return timeStr
  return `${dateStr} ${timeStr}`
}
