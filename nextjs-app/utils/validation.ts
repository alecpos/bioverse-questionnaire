/**
 * Utility functions for form validation and input sanitization
 */

// Type definitions
export interface ValidationRule {
  required?: boolean;
  isEmail?: boolean;
  minLength?: number;
  pattern?: RegExp;
  message?: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface FormErrors {
  [key: string]: string;
}

/**
 * Validates form data against a set of validation rules
 */
export function validateForm(formData: any, validationRules: ValidationRules): FormErrors {
  const errors: FormErrors = {};

  Object.keys(validationRules).forEach(field => {
    const value = formData[field];
    const rules = validationRules[field];

    // Check required fields
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === '') || 
        (Array.isArray(value) && value.length === 0))) {
      errors[field] = rules.message || `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }

    // Check email format
    if (rules.isEmail && value && !validateEmail(value)) {
      errors[field] = 'Please enter a valid email address';
    }

    // Check minimum length
    if (rules.minLength && value && value.length < rules.minLength) {
      errors[field] = `Must be at least ${rules.minLength} characters`;
    }

    // Check pattern match
    if (rules.pattern && value && !rules.pattern.test(value)) {
      errors[field] = rules.message || 'Invalid format';
    }
  });

  return errors;
}

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  // Trim whitespace
  const trimmed = input.trim();
  
  // Replace HTML tags and escape special characters
  return trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): boolean {
  // Check for minimum length (8 characters)
  if (password.length < 8) {
    return false;
  }
  
  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    return false;
  }
  
  // Check for numbers
  if (!/[0-9]/.test(password)) {
    return false;
  }
  
  // Check for special characters
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) {
    return false;
  }
  
  return true;
} 