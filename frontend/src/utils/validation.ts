/**
 * Form Validation Utilities
 *
 * Centralized validation logic for forms across the application.
 * Following Clean Code principles: each function does one thing.
 */

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimum password length
const MIN_PASSWORD_LENGTH = 6;

// =============================================================================
// Validation Result Types
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

// =============================================================================
// Email Validation
// =============================================================================

/**
 * Validates an email address.
 * Returns a validation result with error message if invalid.
 */
export function validateEmail(email: string): ValidationResult {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates email on blur (allows empty for UX).
 * Only shows error if user has typed something invalid.
 */
export function validateEmailOnBlur(email: string): ValidationResult {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { isValid: true, error: null }; // Allow empty on blur
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true, error: null };
}

// =============================================================================
// Password Validation
// =============================================================================

/**
 * Validates a password.
 * Returns a validation result with error message if invalid.
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validates password on blur (allows empty for UX).
 * Only shows error if user has typed something invalid.
 */
export function validatePasswordOnBlur(password: string): ValidationResult {
  if (!password) {
    return { isValid: true, error: null }; // Allow empty on blur
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  return { isValid: true, error: null };
}

// =============================================================================
// Name Validation
// =============================================================================

/**
 * Validates a display name.
 * Returns a validation result with error message if invalid.
 */
export function validateDisplayName(name: string): ValidationResult {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { isValid: false, error: 'Name is required' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates display name on blur (allows empty for UX).
 */
export function validateDisplayNameOnBlur(name: string): ValidationResult {
  // For now, just return valid - no specific format requirements
  return { isValid: true, error: null };
}

// =============================================================================
// Form-level Validation
// =============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData extends LoginFormData {
  displayName: string;
}

export interface FormErrors {
  email: string | null;
  password: string | null;
  displayName?: string | null;
}

/**
 * Validates all login form fields.
 * Returns errors object with field-specific error messages.
 */
export function validateLoginForm(data: LoginFormData): FormErrors {
  const emailResult = validateEmail(data.email);
  const passwordResult = validatePassword(data.password);

  return {
    email: emailResult.error,
    password: passwordResult.error,
  };
}

/**
 * Validates all registration form fields.
 * Returns errors object with field-specific error messages.
 */
export function validateRegisterForm(data: RegisterFormData): FormErrors {
  const emailResult = validateEmail(data.email);
  const passwordResult = validatePassword(data.password);
  const nameResult = validateDisplayName(data.displayName);

  return {
    email: emailResult.error,
    password: passwordResult.error,
    displayName: nameResult.error,
  };
}

/**
 * Checks if a form errors object has any errors.
 */
export function hasFormErrors(errors: FormErrors): boolean {
  return Object.values(errors).some((error) => error !== null);
}
