/**
 * Derives the Blossom HTTP server URL from a WebSocket relay URL.
 * The convention for Zooid (and most self-hosted setups) is that
 * the Blossom server lives on the same host as the relay.
 *
 * wss://relay.example.com       → https://relay.example.com
 * wss://relay.example.com:7777  → https://relay.example.com:7777
 * ws://192.168.1.5:7777         → http://192.168.1.5:7777
 */
export function deriveBlossomUrl(relayUrl: string): string {
  if (relayUrl.startsWith('wss://')) {
    return 'https://' + relayUrl.slice('wss://'.length);
  }
  if (relayUrl.startsWith('ws://')) {
    return 'http://' + relayUrl.slice('ws://'.length);
  }
  // Shouldn't happen given our relay URL validation, but safe fallback
  return relayUrl;
}
