/**
 * Utility functions for timezone conversion
 * Backend stores time in UTC, frontend converts to local timezone for display
 */

/**
 * Parse timezone offset from string format (e.g., "UTC+07:00" -> +7 hours)
 * @param timezone - Timezone string in format "UTC+HH:mm" or "UTC-HH:mm"
 * @returns Offset in hours (e.g., 7 for UTC+07:00, -5 for UTC-05:00)
 */
export function parseTimezoneOffset(timezone: string | undefined | null): number {
  if (!timezone) return 0;
  
  // Handle format "UTC+07:00" or "UTC-05:00"
  if (timezone.startsWith('UTC')) {
    const offsetStr = timezone.substring(3); // Remove "UTC" prefix
    const match = offsetStr.match(/^([+-]?)(\d{1,2}):(\d{2})$/);
    
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const hours = parseInt(match[2], 10);
      const minutes = parseInt(match[3], 10);
      return sign * (hours + minutes / 60);
    }
  }
  
  // Default to UTC if parsing fails
  return 0;
}

/**
 * Convert UTC time to local timezone
 * @param utcTime - Time string in format "HH:mm:ss" or "HH:mm" (UTC)
 * @param timezone - Timezone string (e.g., "UTC+07:00")
 * @returns Time string in local timezone format "HH:mm"
 * 
 * Example: UTC 10:00 + UTC+07:00 = 17:00
 */
export function convertUtcToLocalTime(utcTime: string | undefined | null, timezone: string | undefined | null): string {
  if (!utcTime) return 'N/A';
  
  try {
    // Parse UTC time
    const timeParts = utcTime.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1] || '0', 10);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return utcTime.substring(0, 5);
    }
    
    // Get timezone offset in hours
    const offsetHours = parseTimezoneOffset(timezone);
    
    // Debug logging
    console.log(`[Timezone] Converting UTC time: ${utcTime}, timezone: ${timezone}, offset: ${offsetHours} hours`);
    
    // Calculate local time: UTC time + offset
    // Example: 0:00 UTC + 7 hours = 7:00 (for UTC+07:00)
    // Example: 10:00 UTC + 7 hours = 17:00
    const totalMinutes = hours * 60 + minutes + (offsetHours * 60);
    
    // Handle day rollover (24 hours)
    let localHours = Math.floor(totalMinutes / 60);
    let localMinutes = totalMinutes % 60;
    
    // Handle negative minutes (previous hour)
    if (localMinutes < 0) {
      localMinutes += 60;
      localHours -= 1;
    }
    
    // Handle day rollover (24 hours)
    localHours = ((localHours % 24) + 24) % 24;
    
    const result = `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`;
    console.log(`[Timezone] Result: ${result}`);
    
    // Format as HH:mm
    return result;
  } catch (error) {
    console.error('Error converting UTC to local time:', error);
    return utcTime.substring(0, 5);
  }
}

/**
 * Convert UTC date and time to local timezone DateTime
 * @param utcDate - Date string in format "YYYY-MM-DD" (UTC)
 * @param utcTime - Time string in format "HH:mm:ss" or "HH:mm" (UTC)
 * @param timezone - Timezone string (e.g., "UTC+07:00")
 * @returns Date object in local timezone
 */
export function convertUtcToLocalDateTime(
  utcDate: string | undefined | null,
  utcTime: string | undefined | null,
  timezone: string | undefined | null
): Date | null {
  if (!utcDate || !utcTime) return null;
  
  try {
    // Parse UTC date and time
    const [year, month, day] = utcDate.split('-').map(Number);
    const [hours, minutes] = utcTime.split(':').map(Number);
    
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
      return null;
    }
    
    // Create UTC date
    const utcDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    
    // Get timezone offset in hours
    const offsetHours = parseTimezoneOffset(timezone);
    
    // Convert to local timezone by adding offset
    const localDateTime = new Date(utcDateTime.getTime() + offsetHours * 60 * 60 * 1000);
    
    return localDateTime;
  } catch (error) {
    console.error('Error converting UTC to local DateTime:', error);
    return null;
  }
}

/**
 * Format timezone for display (e.g., "UTC+07:00" -> "+07:00" or just show the offset)
 * @param timezone - Timezone string (e.g., "UTC+07:00")
 * @returns Formatted timezone string for display
 */
export function formatTimezoneForDisplay(timezone: string | undefined | null): string {
  if (!timezone) return 'UTC';
  
  if (timezone.startsWith('UTC')) {
    const offset = timezone.substring(3); // Remove "UTC" prefix
    return `UTC${offset}`;
  }
  
  return timezone;
}

/**
 * Convert local time to UTC (subtract timezone offset)
 * Used when sending time data to backend (backend stores in UTC)
 * @param localTime - Time string in format "HH:mm:ss" or "HH:mm" (local timezone)
 * @param timezone - Timezone string (e.g., "UTC+07:00")
 * @returns Time string in UTC format "HH:mm:ss"
 * 
 * Example: 17:00 local (UTC+07:00) - 7 hours = 10:00 UTC
 */
export function convertLocalTimeToUtc(localTime: string | undefined | null, timezone: string | undefined | null): string {
  if (!localTime) return '';
  
  try {
    // Parse local time
    const timeParts = localTime.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1] || '0', 10);
    const seconds = parseInt(timeParts[2] || '0', 10);
    
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn('[convertLocalTimeToUtc] Invalid time format:', localTime);
      return localTime.includes(':') ? localTime : `${localTime}:00:00`;
    }
    
    // Get timezone offset in hours (negative because we're subtracting)
    const offsetHours = parseTimezoneOffset(timezone);
    
    console.log('[convertLocalTimeToUtc] Converting:', {
      localTime,
      timezone,
      offsetHours,
      hours,
      minutes
    });
    
    // Calculate UTC time: local time - offset
    // Example: 17:00 (UTC+07:00) - 7 hours = 10:00 UTC
    const totalMinutes = hours * 60 + minutes - (offsetHours * 60);
    
    // Handle day rollover (24 hours)
    let utcHours = Math.floor(totalMinutes / 60);
    let utcMinutes = totalMinutes % 60;
    
    // Handle negative minutes (previous hour)
    if (utcMinutes < 0) {
      utcMinutes += 60;
      utcHours -= 1;
    }
    
    // Handle day rollover (24 hours)
    utcHours = ((utcHours % 24) + 24) % 24;
    
    // Format as HH:mm:ss
    const result = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    console.log('[convertLocalTimeToUtc] Result:', result);
    
    return result;
  } catch (error) {
    console.error('Error converting local time to UTC:', error);
    return localTime.includes(':') ? `${localTime}:00` : `${localTime}:00:00`;
  }
}

/**
 * Get timezone from localStorage
 * @returns Timezone string or null if not found
 */
export function getTimezoneFromStorage(): string | null {
  return localStorage.getItem('timezone');
}

