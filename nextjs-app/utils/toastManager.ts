import { UseToastOptions } from '@chakra-ui/react';

// Keep track of recent toasts to prevent duplicates
interface ToastRecord {
  title: string;
  status: string;
  timestamp: number;
}

const recentToasts: ToastRecord[] = [];
const TOAST_DEDUPE_WINDOW = 2000; // 2 seconds window to prevent duplicate toasts

/**
 * Manages toast notifications to prevent duplicate toasts in rapid succession
 * 
 * @param toast - The Chakra UI useToast function instance
 * @param options - Toast options (title, description, status, etc.)
 * @returns true if toast was shown, false if it was suppressed as duplicate
 */
export const showToast = (
  toast: (options?: UseToastOptions) => any,
  options: UseToastOptions
): boolean => {
  // Clean up expired toasts
  const now = Date.now();
  while (recentToasts.length > 0 && now - recentToasts[0].timestamp > TOAST_DEDUPE_WINDOW) {
    recentToasts.shift();
  }

  // Check if a similar toast is already active
  const isDuplicate = recentToasts.some(
    (record) => 
      record.title === String(options.title || '') && 
      record.status === String(options.status || 'info')
  );

  if (isDuplicate) {
    console.log('Suppressing duplicate toast:', options.title);
    return false;
  }

  // Add this toast to recent toasts
  recentToasts.push({
    title: String(options.title || ''),
    status: String(options.status || 'info'),
    timestamp: now
  });

  // Show the toast
  toast({
    ...options,
    duration: options.duration || 3000, // Default duration
    isClosable: options.isClosable !== false, // Default to closable
  });

  return true;
} 