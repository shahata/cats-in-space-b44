// Frontend Wix SDK client with localStorage-backed token persistence.
// Tokens are minted by the wixSession backend function.
import { createClient, OAuthStrategy } from '@wix/sdk';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'wix_session_tokens';
const KIND_KEY = 'wix_session_kind';

function readTokens() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens, kind) {
  if (!tokens) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(KIND_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  if (kind) localStorage.setItem(KIND_KEY, kind);
}

export function getStoredKind() {
  return localStorage.getItem(KIND_KEY) || null;
}

/**
 * Returns the current Wix access token value (member or visitor), or null.
 * Use this when calling backend functions that need to act on behalf of the
 * current Wix session (e.g. cart operations).
 */
export function getWixAccessToken() {
  const tokens = readTokens();
  return tokens?.accessToken?.value || null;
}

/**
 * Returns the full Wix tokens object ({ accessToken, refreshToken }) for
 * passing to backend functions that need to act on behalf of the current
 * Wix session (e.g. cart operations via the currentCart API).
 */
export function getWixTokens() {
  return readTokens();
}

let _client = null;

function getClientId() {
  // Public Wix client ID is safe to expose. Pulled from getWixConfig at runtime
  // if not set here. For simplicity we rely on the backend session call.
  return import.meta.env?.VITE_WIX_CLIENT_ID || '';
}

export function getWixClient() {
  if (_client) return _client;
  const clientId = getClientId();
  _client = createClient({
    auth: OAuthStrategy({ clientId, tokens: readTokens() || undefined }),
  });
  return _client;
}

/**
 * Refresh Wix session from backend. Call on app start and after auth changes.
 * Returns { kind: 'member' | 'visitor', tokens } or null on failure.
 */
export async function refreshWixSession() {
  try {
    const res = await base44.functions.invoke('wixSession', {});
    const data = res?.data;
    if (data?.tokens) {
      writeTokens(data.tokens, data.kind);
      // Rebuild client so it picks up new tokens
      _client = null;
      getWixClient();
      return data;
    }
  } catch (e) {
    console.error('[wixClient] refresh failed:', e?.message);
  }
  return null;
}

export function clearWixSession() {
  writeTokens(null);
  _client = null;
}