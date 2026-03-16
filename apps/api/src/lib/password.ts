import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Password Policy Module
// ---------------------------------------------------------------------------
// - Minimum 12 characters
// - bcrypt cost factor 12
// - HaveIBeenPwned API check (k-anonymity model)
// - Clear error messages for policy violations
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;
const MIN_LENGTH = 12;
const HIBP_API_URL = 'https://api.pwnedpasswords.com/range/';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a password against the policy.
 * Returns validation result with clear error messages.
 */
export async function validatePassword(password: string): Promise<PasswordValidationResult> {
  const errors: string[] = [];

  // Length check
  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long (currently ${password.length})`);
  }

  // Complexity checks
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // HaveIBeenPwned breach check (only if basic checks pass)
  if (errors.length === 0) {
    const breached = await checkHaveIBeenPwned(password);
    if (breached) {
      errors.push(
        'This password has appeared in a known data breach. Please choose a different password.',
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check password against HaveIBeenPwned API using k-anonymity model.
 * Sends only the first 5 characters of the SHA-1 hash to the API.
 * Returns true if the password has been breached.
 */
async function checkHaveIBeenPwned(password: string): Promise<boolean> {
  try {
    // SHA-1 hash the password
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    // Query HIBP API with hash prefix
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(`${HIBP_API_URL}${prefix}`, {
      headers: {
        'User-Agent': 'Soterion-Platform-PasswordCheck',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // API error — allow password but log warning
      console.warn(`[Password] HIBP API returned ${response.status}, allowing password`);
      return false;
    }

    const body = await response.text();

    // Check if our suffix appears in the response
    const lines = body.split('\n');
    for (const line of lines) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return true; // Password found in breach database
      }
    }

    return false;
  } catch (err) {
    // If API is unavailable, allow password but log warning
    console.warn('[Password] HIBP API unavailable, allowing password:', err instanceof Error ? err.message : 'Unknown error');
    return false;
  }
}

/**
 * Hash a password with bcrypt (cost factor 12).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
