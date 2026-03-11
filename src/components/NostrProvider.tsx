import React, { useEffect, useRef } from 'react';
import { NostrEvent, NostrFilter, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { NLoginType, NUser, useNostrLogin } from '@nostrify/react/login';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

/** Synchronously build a signer from a login record, or return undefined. */
function signerFromLogin(login: NLoginType) {
  try {
    switch (login.type) {
      case 'nsec':      return NUser.fromNsecLogin(login).signer;
      case 'extension': return NUser.fromExtensionLogin(login).signer;
      default:          return undefined;
    }
  } catch {
    return undefined;
  }
}

/**
 * Creates a NRelay1 instance that waits for NIP-42 auth to complete
 * before sending any REQ messages. This prevents the relay from closing
 * subscriptions with "auth-required" because we sent REQ before AUTH.
 */
function createAuthAwareRelay(
  url: string,
  signerRef: React.MutableRefObject<NUser['signer'] | undefined>
): NRelay1 {
  // Promise that resolves once auth is complete (or no auth needed)
  let authResolve: () => void;
  let authReject: (err: Error) => void;

  const authReady = new Promise<void>((resolve, reject) => {
    authResolve = resolve;
    authReject = reject;
  });

  // Set a timeout — if no AUTH challenge arrives within 3s, assume no auth needed
  const authTimeout = setTimeout(() => {
    console.log('[NostrProvider] No AUTH challenge received within 3s, proceeding without auth');
    authResolve();
  }, 3000);

  const relay = new NRelay1(url, {
    auth: async (challenge: string) => {
      clearTimeout(authTimeout);
      console.log('[NostrProvider] AUTH challenge received, signing...');

      const signer = signerRef.current;
      if (!signer) {
        const err = new Error('NIP-42 auth failed: not logged in');
        authReject(err);
        throw err;
      }

      try {
        const event = await signer.signEvent({
          kind: 22242,
          content: '',
          tags: [
            ['relay', url],
            ['challenge', challenge],
          ],
          created_at: Math.floor(Date.now() / 1000),
        });

        console.log('[NostrProvider] AUTH signed, pubkey:', event.pubkey);

        // Give the relay a moment to process the AUTH before we send REQs
        setTimeout(() => authResolve(), 500);

        return event;
      } catch (err) {
        console.error('[NostrProvider] AUTH signing failed:', err);
        authReject(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    log: (entry) => {
      console.log('[NRelay1]', entry);
    },
  });

  // Patch the req method to wait for auth before proceeding
  const originalReq = relay.req.bind(relay);
  relay.req = async function* (filters, opts) {
    console.log('[NostrProvider] REQ waiting for auth...');
    await authReady;
    console.log('[NostrProvider] REQ proceeding after auth, filters:', JSON.stringify(filters));
    yield* originalReq(filters, opts);
  };

  return relay;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();
  const { logins } = useNostrLogin();
  const queryClient = useQueryClient();

  const relayMetadata = useRef(config.relayMetadata);
  const signerRef = useRef<NUser['signer'] | undefined>(undefined);

  // Update synchronously on every render so auth callback always has current signer
  signerRef.current = logins[0] ? signerFromLogin(logins[0]) : undefined;

  useEffect(() => {
    relayMetadata.current = config.relayMetadata;
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [config.relayMetadata, queryClient]);

  const relayKey = config.relayMetadata.relays.map(r => r.url).join(',');
  const poolRef = useRef<{ pool: NPool; key: string } | undefined>(undefined);

  if (!poolRef.current || poolRef.current.key !== relayKey) {
    poolRef.current = undefined;

    console.log('[NostrProvider] Creating pool, relays:', relayKey || '(none)');

    const pool = new NPool({
      open(url: string) {
        console.log('[NostrProvider] Opening relay:', url);
        return createAuthAwareRelay(url, signerRef);
      },
      reqRouter(filters: NostrFilter[]) {
        const readRelays = relayMetadata.current.relays
          .filter(r => r.read)
          .map(r => r.url);
        console.log('[NostrProvider] Routing REQ to:', readRelays);
        const routes = new Map<string, NostrFilter[]>();
        for (const url of readRelays) {
          routes.set(url, filters);
        }
        return routes;
      },
      eventRouter(_event: NostrEvent) {
        const writeRelays = relayMetadata.current.relays
          .filter(r => r.write)
          .map(r => r.url);
        return [...new Set(writeRelays)];
      },
      eoseTimeout: 10000,
    });

    poolRef.current = { pool, key: relayKey };
  }

  return (
    <NostrContext.Provider value={{ nostr: poolRef.current.pool }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;
