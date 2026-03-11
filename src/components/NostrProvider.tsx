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

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();
  const { logins } = useNostrLogin();
  const queryClient = useQueryClient();

  // Refs hold the latest values so the pool callbacks always see current state
  const relayMetadata = useRef(config.relayMetadata);
  const signerRef = useRef<NUser['signer'] | undefined>(undefined);

  // Update signerRef synchronously on every render so it's always current
  // when the auth callback fires (which may happen before effects run)
  signerRef.current = logins[0] ? signerFromLogin(logins[0]) : undefined;

  // Keep relayMetadata ref in sync and invalidate queries when it changes
  useEffect(() => {
    relayMetadata.current = config.relayMetadata;
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [config.relayMetadata, queryClient]);

  // Recreate the pool whenever the relay list changes so new relays connect
  const relayKey = config.relayMetadata.relays.map(r => r.url).join(',');
  const poolRef = useRef<{ pool: NPool; key: string } | undefined>(undefined);

  if (!poolRef.current || poolRef.current.key !== relayKey) {
    poolRef.current = undefined;

    console.log('[NostrProvider] Creating pool with relays:', relayKey || '(none)');
    console.log('[NostrProvider] Signer available:', !!signerRef.current);
    console.log('[NostrProvider] Login type:', logins[0]?.type ?? 'none');

    const pool = new NPool({
      open(url: string) {
        console.log('[NostrProvider] Opening relay connection:', url);
        return new NRelay1(url, {
          auth: async (challenge: string) => {
            console.log('[NostrProvider] AUTH challenge received from:', url, 'challenge:', challenge);
            const signer = signerRef.current;
            if (!signer) {
              console.error('[NostrProvider] AUTH failed — no signer available');
              throw new Error('NIP-42 auth failed: no signer available. Please log in.');
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
              console.log('[NostrProvider] AUTH event signed successfully, pubkey:', event.pubkey);
              return event;
            } catch (err) {
              console.error('[NostrProvider] AUTH signing failed:', err);
              throw err;
            }
          },
          log: (entry) => {
            console.log('[NRelay1]', entry);
          },
        });
      },
      reqRouter(filters: NostrFilter[]) {
        const readRelays = relayMetadata.current.relays
          .filter(r => r.read)
          .map(r => r.url);
        console.log('[NostrProvider] Routing query to relays:', readRelays, 'filters:', JSON.stringify(filters));
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
      eoseTimeout: 3000,
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
