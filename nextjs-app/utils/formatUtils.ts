/**
 * Format a date string to a human-readable format
 * @param dateString - The date string to format
 * @returns The formatted date string
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  // Format: "Jan 1, 2023"
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', options);
};

/**
 * Format a date to a simple date-only string (YYYY-MM-DD)
 * @param date - The date to format
 * @returns The formatted date string
 */
export const formatDateSimple = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Get a color based on completion rate
 * @param rate - The completion rate (0-100)
 * @returns The color name
 */
export const getColorByRate = (rate: number): string => {
  if (rate >= 80) return 'green';
  if (rate >= 50) return 'yellow';
  if (rate >= 30) return 'orange';
  return 'red';
}; 