/**
 * Tests for validation utilities
 *
 * Tests email, password, display name, and form validation
 */

import {
  validateEmail,
  validateEmailOnBlur,
  validatePassword,
  validatePasswordOnBlur,
  validateDisplayName,
  validateDisplayNameOnBlur,
  validateLoginForm,
  validateRegisterForm,
  hasFormErrors,
} from '../validation';

describe('Email Validation', () => {
  describe('validateEmail', () => {
    it('should return error for empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should return error for whitespace-only email', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should return error for invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        'no@spaces.in" quotes',
      ];

      invalidEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a valid email address');
      });
    });

    it('should return valid for correct email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
        'test123@test-domain.com',
      ];

      validEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });
    });

    it('should trim whitespace before validating', () => {
      const result = validateEmail('  test@example.com  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateEmailOnBlur', () => {
    it('should allow empty email on blur', () => {
      const result = validateEmailOnBlur('');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow whitespace-only on blur', () => {
      const result = validateEmailOnBlur('   ');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return error for invalid email on blur', () => {
      const result = validateEmailOnBlur('notanemail');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('should return valid for correct email on blur', () => {
      const result = validateEmailOnBlur('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
  });
});

describe('Password Validation', () => {
  describe('validatePassword', () => {
    it('should return error for empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should return error for password shorter than 6 characters', () => {
      const shortPasswords = ['a', 'ab', 'abc', 'abcd', 'abcde'];

      shortPasswords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Password must be at least 6 characters');
      });
    });

    it('should return valid for password with 6 or more characters', () => {
      const validPasswords = ['abcdef', 'password', 'very-long-password-123'];

      validPasswords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });
    });
  });

  describe('validatePasswordOnBlur', () => {
    it('should allow empty password on blur', () => {
      const result = validatePasswordOnBlur('');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return error for short password on blur', () => {
      const result = validatePasswordOnBlur('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 6 characters');
    });

    it('should return valid for valid password on blur', () => {
      const result = validatePasswordOnBlur('validpass');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
  });
});

describe('Display Name Validation', () => {
  describe('validateDisplayName', () => {
    it('should return error for empty name', () => {
      const result = validateDisplayName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should return error for whitespace-only name', () => {
      const result = validateDisplayName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should return valid for any non-empty name', () => {
      const validNames = ['John', 'Jane Doe', 'User123', '用户'];

      validNames.forEach((name) => {
        const result = validateDisplayName(name);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });
    });
  });

  describe('validateDisplayNameOnBlur', () => {
    it('should always return valid on blur', () => {
      const names = ['', '   ', 'John', 'Jane Doe'];

      names.forEach((name) => {
        const result = validateDisplayNameOnBlur(name);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });
    });
  });
});

describe('Form Validation', () => {
  describe('validateLoginForm', () => {
    it('should return errors for empty form', () => {
      const errors = validateLoginForm({ email: '', password: '' });
      expect(errors.email).toBe('Email is required');
      expect(errors.password).toBe('Password is required');
    });

    it('should return null errors for valid form', () => {
      const errors = validateLoginForm({
        email: 'test@example.com',
        password: 'validpassword',
      });
      expect(errors.email).toBeNull();
      expect(errors.password).toBeNull();
    });

    it('should return only email error for valid password', () => {
      const errors = validateLoginForm({
        email: 'invalid',
        password: 'validpassword',
      });
      expect(errors.email).toBe('Please enter a valid email address');
      expect(errors.password).toBeNull();
    });

    it('should return only password error for valid email', () => {
      const errors = validateLoginForm({
        email: 'test@example.com',
        password: 'short',
      });
      expect(errors.email).toBeNull();
      expect(errors.password).toBe('Password must be at least 6 characters');
    });
  });

  describe('validateRegisterForm', () => {
    it('should return errors for empty form', () => {
      const errors = validateRegisterForm({
        email: '',
        password: '',
        displayName: '',
      });
      expect(errors.email).toBe('Email is required');
      expect(errors.password).toBe('Password is required');
      expect(errors.displayName).toBe('Name is required');
    });

    it('should return null errors for valid form', () => {
      const errors = validateRegisterForm({
        email: 'test@example.com',
        password: 'validpassword',
        displayName: 'John Doe',
      });
      expect(errors.email).toBeNull();
      expect(errors.password).toBeNull();
      expect(errors.displayName).toBeNull();
    });

    it('should validate all fields independently', () => {
      const errors = validateRegisterForm({
        email: 'invalid',
        password: 'short',
        displayName: '  ',
      });
      expect(errors.email).toBe('Please enter a valid email address');
      expect(errors.password).toBe('Password must be at least 6 characters');
      expect(errors.displayName).toBe('Name is required');
    });
  });

  describe('hasFormErrors', () => {
    it('should return false for form with no errors', () => {
      const errors = { email: null, password: null };
      expect(hasFormErrors(errors)).toBe(false);
    });

    it('should return true for form with email error', () => {
      const errors = { email: 'Invalid email', password: null };
      expect(hasFormErrors(errors)).toBe(true);
    });

    it('should return true for form with password error', () => {
      const errors = { email: null, password: 'Too short' };
      expect(hasFormErrors(errors)).toBe(true);
    });

    it('should return true for form with multiple errors', () => {
      const errors = { email: 'Invalid', password: 'Too short' };
      expect(hasFormErrors(errors)).toBe(true);
    });

    it('should return true for register form with displayName error', () => {
      const errors = { email: null, password: null, displayName: 'Required' };
      expect(hasFormErrors(errors)).toBe(true);
    });
  });
});
