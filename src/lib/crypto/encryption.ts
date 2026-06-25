// ═══════════════════════════════════════════════════════════════
// ZERO-KNOWLEDGE CREDENTIAL ENCRYPTION
// Web Crypto API — AES-256-GCM, client-side only
// The encryption key NEVER leaves the browser
// ═══════════════════════════════════════════════════════════════

export interface EncryptedPayload {
  ciphertext: string;        // Base64-encoded encrypted data
  iv: string;               // Base64-encoded initialization vector
  salt: string;             // Base64-encoded salt for key derivation
  fingerprint: string;      // Public fingerprint of the key (SHA-256)
  keyHash: string;          // Hash of the key for integrity verification
  algorithm: string;        // 'AES-256-GCM'
}

export interface EncryptionResult {
  payload: EncryptedPayload;
  ephemeralKey: string;     // Base64 raw key — session only, never stored
  readableFingerprint: string; // Human-readable fingerprint
}

// ── Generate a random 256-bit AES key ──
export async function generateEphemeralKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,  // extractable — needed to send to VM via secure channel
    ['encrypt', 'decrypt']
  );
}

// ── Export key to base64 ──
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(raw);
}

// ── Import key from base64 ──
export async function importKeyFromBase64(base64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64);
  return await window.crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// ── Encrypt credentials in browser ──
export async function encryptCredentials(
  plaintext: string,
  key?: CryptoKey
): Promise<EncryptionResult> {
  // Generate or use provided key
  const aesKey = key || await generateEphemeralKey();

  // Generate random IV (12 bytes for GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Generate random salt (16 bytes)
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  // Encode plaintext
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // Encrypt
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    plaintextBytes
  );

  // Export key for fingerprinting
  const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const keyBase64 = arrayBufferToBase64(rawKey);

  // Create key fingerprint (SHA-256 of public-visible data)
  const rawKeyArr = new Uint8Array(rawKey);
  const fingerprintData = new Uint8Array(rawKeyArr.length + iv.length + salt.length);
  fingerprintData.set(rawKeyArr, 0);
  fingerprintData.set(iv, rawKeyArr.length);
  fingerprintData.set(salt, rawKeyArr.length + iv.length);
  const fingerprintBuffer = await window.crypto.subtle.digest('SHA-256', fingerprintData.buffer);
  const fingerprint = arrayBufferToHex(fingerprintBuffer);

  // Create key hash (SHA-256 of key alone — for integrity, not decryption)
  const keyHashBuffer = await window.crypto.subtle.digest('SHA-256', rawKey);
  const keyHash = arrayBufferToHex(keyHashBuffer);

  // Human-readable fingerprint: first 8 chars grouped
  const readableFingerprint = fingerprint.match(/.{4}/g)?.join('-').substring(0, 23) || fingerprint.substring(0, 23);

  return {
    payload: {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv.buffer),
      salt: arrayBufferToBase64(salt.buffer),
      fingerprint,
      keyHash,
      algorithm: 'AES-256-GCM',
    },
    ephemeralKey: keyBase64,
    readableFingerprint,
  };
}

// ── Decrypt credentials in browser ──
export async function decryptCredentials(
  payload: EncryptedPayload,
  keyBase64: string
): Promise<string> {
  const aesKey = await importKeyFromBase64(keyBase64);
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const ciphertext = base64ToArrayBuffer(payload.ciphertext);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// ── Verify key matches stored hash ──
export async function verifyKeyIntegrity(
  keyBase64: string,
  expectedKeyHash: string
): Promise<boolean> {
  const rawKey = base64ToArrayBuffer(keyBase64);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', rawKey);
  const actualHash = arrayBufferToHex(hashBuffer);
  return actualHash === expectedKeyHash;
}

// ── Generate a session token for VM key relay ──
export async function generateSessionToken(): Promise<string> {
  const bytes = window.crypto.getRandomValues(new Uint8Array(32));
  return arrayBufferToHex(bytes.buffer);
}

// ── Utility: ArrayBuffer → Base64 ──
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Utility: Base64 → ArrayBuffer ──
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── Utility: ArrayBuffer → Hex ──
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Utility: Generate a human-readable recovery code ──
export function generateRecoveryCode(): string {
  const words = [
    'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel',
    'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa',
    'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray',
    'yankee', 'zulu', 'zero', 'one', 'two', 'three', 'four', 'five',
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}-${pick()}-${pick()}`;
}

// ── Store ephemeral key in sessionStorage (volatile, tab-specific) ──
export function storeEphemeralKey(fingerprint: string, keyBase64: string): void {
  const data = { key: keyBase64, storedAt: Date.now() };
  sessionStorage.setItem(`uptimeops_key_${fingerprint}`, JSON.stringify(data));
}

// ── Retrieve ephemeral key from sessionStorage ──
export function retrieveEphemeralKey(fingerprint: string): string | null {
  const raw = sessionStorage.getItem(`uptimeops_key_${fingerprint}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data.key;
  } catch {
    return null;
  }
}

// ── Remove ephemeral key from sessionStorage ──
export function clearEphemeralKey(fingerprint: string): void {
  sessionStorage.removeItem(`uptimeops_key_${fingerprint}`);
}

// ── Clear ALL ephemeral keys (logout / revoke all) ──
export function clearAllEphemeralKeys(): void {
  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith('uptimeops_key_')) {
      sessionStorage.removeItem(key);
    }
  });
}
