import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Get the encryption key from environment variable.
 * The key must be exactly 32 bytes (256 bits) encoded as a 64-character hex string.
 *
 * @throws Error if ENCRYPTION_KEY is not set or is invalid
 */
function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  if (keyHex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Got ${keyHex.length} characters.`,
    );
  }

  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Returns a string in the format: iv:authTag:ciphertext (all hex-encoded).
 * The IV is randomly generated for each encryption call to ensure uniqueness.
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string that was encrypted with the encrypt() function.
 *
 * @param encryptedString - String in format iv:authTag:ciphertext (all hex-encoded)
 * @returns The original plaintext string
 * @throws Error if decryption fails (tampered data, wrong key, etc.)
 */
export function decrypt(encryptedString: string): string {
  const key = getKey();
  const parts = encryptedString.split(':');

  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted string format. Expected iv:authTag:ciphertext',
    );
  }

  const [ivHex, authTagHex, ciphertext] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
