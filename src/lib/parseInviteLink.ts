/**
 * Parses a localmarket / Flotilla-compatible invite link.
 *
 * Supported formats:
 *  1. Flotilla-style:  https://any.host/join?r=wss://relay.example.com&c=CLAIMCODE
 *  2. Query params:    https://localmarket.app?r=wss://relay.example.com&c=CLAIMCODE
 *  3. Hash fragment:   wss://relay.example.com#claim=CLAIMCODE
 *  4. Bare relay URL:  wss://relay.example.com  (no claim — open relay or public_join=true)
 *  5. HTTPS converted: https://relay.example.com  → wss://relay.example.com
 *  6. nostr+relay://   nostr+relay://relay.example.com
 */

export interface InviteData {
  /** WebSocket relay URL, normalised (no trailing slash) */
  url: string;
  /** Claim code for kind 28934 join request, or empty string if none */
  claim: string;
}

function normalizeWs(raw: string): string | null {
  let url = raw.trim();

  if (url.startsWith('wss://') || url.startsWith('ws://')) {
    // already WebSocket
  } else if (url.startsWith('https://')) {
    url = 'wss://' + url.slice('https://'.length);
  } else if (url.startsWith('http://')) {
    url = 'ws://' + url.slice('http://'.length);
  } else if (url.startsWith('nostr+relay://')) {
    url = 'wss://' + url.slice('nostr+relay://'.length);
  } else {
    return null;
  }

  // Strip trailing slash
  return url.replace(/\/+$/, '');
}

export function parseInviteLink(input: string): InviteData | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try parsing as a full URL with query params (?r=...&c=...)
  try {
    const parsed = new URL(trimmed);
    const r = parsed.searchParams.get('r');
    const c = parsed.searchParams.get('c') ?? '';

    if (r) {
      const url = normalizeWs(r);
      if (url) return { url, claim: c };
    }

    // No ?r= param — maybe it's a plain HTTPS relay URL
    const url = normalizeWs(trimmed.split('?')[0].split('#')[0]);
    if (url) {
      const claim = parsed.searchParams.get('claim') ?? '';
      return { url, claim };
    }
  } catch {
    // Not a valid URL — try other formats
  }

  // Try hash fragment: wss://relay.example.com#claim=CLAIMCODE
  if (trimmed.includes('#')) {
    const [base, fragment] = trimmed.split('#');
    const url = normalizeWs(base);
    if (url) {
      const params = new URLSearchParams(fragment);
      const claim = params.get('claim') ?? '';
      return { url, claim };
    }
  }

  // Bare relay URL with no claim
  const url = normalizeWs(trimmed);
  if (url) return { url, claim: '' };

  return null;
}
