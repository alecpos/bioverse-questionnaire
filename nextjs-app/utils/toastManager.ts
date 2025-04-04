import { UseToastOptions } from '@chakra-ui/react';

// Keep track of recent toasts to prevent duplicates
interface ToastRecord {
  id: string;  // A unique ID composed of title+description for better uniqueness
  title: string;
  description: string;
  status: string;
  timestamp: number;
}

const recentToasts: ToastRecord[] = [];
const TOAST_DEDUPE_WINDOW = 5000; // 5 seconds window to prevent duplicate toasts

// These toasts should show only once per session
const PERSISTENT_TOASTS: string[] = []; 

// Specific IDs to use for well-known toasts for better deduplication
const KNOWN_TOAST_IDS = {
  SESSION_EXPIRED: 'session-expired',
  SUBMIT_SUCCESS: 'submit-success'
};

// Persistent toasts that should be shown only once per session
const persistentToastShown: Set<string> = new Set();

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
  const title = String(options.title || '');
  const description = String(options.description || '');
  const status = String(options.status || 'info');
  
  // Generate a unique ID for this toast - use predefined ID for known toasts
  let toastId = `${title}:${status}`;
  
  // Assign specific IDs to well-known toasts for better deduplication
  if (title.includes('Session expired')) {
    toastId = KNOWN_TOAST_IDS.SESSION_EXPIRED;
  } else if (title.includes('Questionnaire submitted')) {
    toastId = KNOWN_TOAST_IDS.SUBMIT_SUCCESS;
  }
  
  // Special handling for persistent toasts that should show only once per session
  if (PERSISTENT_TOASTS.some(pt => title.includes(pt))) {
    if (persistentToastShown.has(toastId)) {
      console.log('Suppressing persistent toast that was already shown:', title);
      return false;
    }
    persistentToastShown.add(toastId);
  }
  
  // Clean up expired toasts
  const now = Date.now();
  while (recentToasts.length > 0 && now - recentToasts[0].timestamp > TOAST_DEDUPE_WINDOW) {
    recentToasts.shift();
  }

  // Check if a similar toast is already active
  const isDuplicate = recentToasts.some(
    (record) => record.id === toastId
  );

  if (isDuplicate) {
    console.log('Suppressing duplicate toast:', title);
    return false;
  }

  // Add this toast to recent toasts
  recentToasts.push({
    id: toastId,
    title,
    description,
    status,
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