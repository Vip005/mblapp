/**
 * JWT Utility functions for decoding payload and checking token expiration.
 */

export interface JwtPayload {
  nameid?: string;
  CustomerId?: string;
  role?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  iss?: string;
  aud?: string;
  [key: string]: any;
}

/**
 * Decodes base64url string across React Native, Hermes, and Web environments.
 */
export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }

  // Environment with global.atob
  if (typeof atob === 'function') {
    try {
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      return atob(base64);
    }
  }

  // Pure JavaScript base64 decode fallback
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');

  while (i < base64.length) {
    const enc1 = chars.indexOf(base64.charAt(i++));
    const enc2 = chars.indexOf(base64.charAt(i++));
    const enc3 = chars.indexOf(base64.charAt(i++));
    const enc4 = chars.indexOf(base64.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }

  return output;
}

/**
 * Parses the JWT string and returns the JSON payload.
 * Returns null if the token format is invalid or cannot be parsed.
 */
export function parseJwt(token: string | null | undefined): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  try {
    const decoded = base64UrlDecode(parts[1]);
    return JSON.parse(decoded) as JwtPayload;
  } catch (err) {
    console.warn('[JWT] Failed to decode token payload:', err);
    return null;
  }
}

/**
 * Checks if a JWT token is missing, malformed, or expired.
 * 
 * @param token The JWT token string
 * @param bufferSeconds Optional margin of safety before actual expiration (default: 10s)
 * @returns true if token is missing, corrupted, or expired; false if valid and active
 */
export function isTokenExpired(token: string | null | undefined, bufferSeconds: number = 10): boolean {
  if (!token || typeof token !== 'string') return true;

  const payload = parseJwt(token);
  if (!payload) return true;

  if (typeof payload.exp !== 'number') {
    // If no exp claim exists, treat as invalid
    return true;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= (nowSeconds + bufferSeconds);
}

/**
 * Returns the expiration Date of a JWT token, or null if invalid.
 */
export function getTokenExpiryDate(token: string | null | undefined): Date | null {
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return new Date(payload.exp * 1000);
}
