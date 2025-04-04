/**
 * Formats a date string to the user's local date and time format
 * @param dateString - ISO date string to format
 * @param options - Optional Intl.DateTimeFormatOptions
 * @param tzName - Optional timezone name from database (e.g. 'America/New_York')
 * @param tzOffset - Optional timezone offset from database (e.g. '-04:00')
 * @returns Formatted date string in user's locale
 */
export const formatLocalDateTime = (
  dateString: string, 
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  },
  tzName?: string,
  tzOffset?: string
): string => {
  try {
    // Create a date object from the input string
    const dbDate = new Date(dateString);
    
    // Always use EST timezone (UTC-5) regardless of user browser timezone
    // Note: We use -5 for EST (not EDT which would be -4)
    const estDate = new Date(dbDate);
    estDate.setHours(dbDate.getHours() - 5);
    
    // Format with browser's locale but force EST timezone
    const formatted = new Intl.DateTimeFormat(
      navigator.language || 'en-US',
      {
        ...options,
        timeZone: 'America/New_York' // Force EST/EDT timezone
      }
    ).format(dbDate); // Use original date as timeZone option handles the conversion
    
    return formatted;
  } catch (e) {
    console.error('Error formatting date:', e, dateString);
    return dateString || 'Unknown date';
  }
};

/**
 * Get EST timezone name
 * @returns Always returns "America/New_York" for EST timezone
 */
export const getUserTimezone = (): string => {
  // Always use EST timezone instead of user's browser timezone
  return 'America/New_York';
};

/**
 * Get EST timezone offset string
 * @returns Always returns "-05:00" for EST timezone (not EDT)
 */
export const getTimezoneOffsetString = (): string => {
  // Always use EST timezone offset (-05:00) instead of user's browser timezone
  return '-05:00';
}; 