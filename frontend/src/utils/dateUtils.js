/**
 * Formats a date string or timestamp into Bangladesh Time (BD Time / Asia/Dhaka)
 * Format: "27 Jul 2026, 09:30 PM"
 *
 * @param {string|number|Date} dateInput
 * @returns {string} Formatted BD date & time string
 */
export function formatBDMessageTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Formats a date string or timestamp into Bangladesh Time (BD Time / Asia/Dhaka) - Time Only
 * Format: "09:30 PM"
 *
 * @param {string|number|Date} dateInput
 * @returns {string} Formatted BD time string
 */
export function formatBDTimeOnly(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}
