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
    // Log all parameters for debugging
    console.log('formatLocalDateTime called with:');
    console.log('- dateString:', dateString);
    console.log('- options:', JSON.stringify(options));
    console.log('- tzName:', tzName || 'not provided');
    console.log('- tzOffset:', tzOffset || 'not provided');
    
    // Create a hardcoded UTC date for the received string
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`User's browser timezone: ${userTimezone}`);
    
    // The database stores dates in UTC (or maybe EST/EDT)
    const dbDate = new Date(dateString);
    console.log(`Original date parsed: ${dbDate.toString()}`);
    console.log(`Original date in ISO: ${dbDate.toISOString()}`);
    console.log(`Original date in UTC: ${dbDate.toUTCString()}`);
    console.log(`Original date in user locale: ${dbDate.toLocaleString()}`);
    
    // Apply a -4 hour offset (assuming EST)
    const estDate = new Date(dbDate);
    estDate.setHours(estDate.getHours() - 4);
    console.log(`Date adjusted for EST (UTC-4): ${estDate.toString()}`);

    // Format with browser's locale/timezone
    const formatted = new Intl.DateTimeFormat(
      navigator.language || 'en-US',
      options
    ).format(estDate);
    
    console.log(`Final formatted date: ${formatted}`);
    return formatted;
  } catch (e) {
    console.error('Error formatting date:', e, dateString);
    return dateString || 'Unknown date';
  }
};

/**
 * Get current timezone name from browser
 * @returns Timezone name (e.g., "America/New_York") or fallback
 */
export const getUserTimezone = (): string => {
  try {
    // Get the browser's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`User's detected timezone: ${timezone}`);
    return timezone;
  } catch (e) {
    console.error('Error getting user timezone:', e);
    return 'UTC'; // Fallback to UTC
  }
};

/**
 * Get timezone offset string in format "+/-HH:MM"
 * @returns Formatted timezone offset
 */
export const getTimezoneOffsetString = (): string => {
  try {
    // Get browser's timezone offset in minutes (note: getTimezoneOffset returns opposite sign)
    const offset = new Date().getTimezoneOffset();
    const hours = Math.abs(Math.floor(offset / 60));
    const minutes = Math.abs(offset % 60);
    // Note: JavaScript's getTimezoneOffset returns the opposite sign of what we need
    // If offset is negative (e.g., -300 for EST), we need a + sign
    const sign = offset <= 0 ? '+' : '-';
    
    const result = `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    console.log(`User's timezone offset: ${result} (raw offset: ${offset} minutes)`);
    return result;
  } catch (e) {
    console.error('Error getting timezone offset:', e);
    return '+00:00'; // Fallback to UTC
  }
}; 