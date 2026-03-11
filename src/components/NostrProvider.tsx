import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import { NostrEvent, NostrFilter, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { NLoginType, NUser, useNostrLogin } from '@nostrify/react/login';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

// Context that tells the rest of the app whether the relay is authed and ready
export const RelayReadyContext = createContext(false);
export const useRelayReady = () => useContext(RelayReadyContext);

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
  const [relayReady, setRelayReady] = useState(false);

  const relayMetadata = useRef(config.relayMetadata);
  const signerRef = useRef<NUser['signer'] | undefined>(undefined);
  const setRelayReadyRef = useRef(setRelayReady);

  // Update synchronously on every render
  signerRef.current = logins[0] ? signerFromLogin(logins[0]) : undefined;
  setRelayReadyRef.current = setRelayReady;

  const relayKey = config.relayMetadata.relays.map(r => r.url).join(',');

  useEffect(() => {
    relayMetadata.current = config.relayMetadata;
    // Reset ready state when relay changes — will be set again after auth
    if (relayKey) {
      setRelayReady(false);
    }
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [config.relayMetadata, queryClient, relayKey]);

  const poolRef = useRef<{ pool: NPool; key: string } | undefined>(undefined);

  if (!poolRef.current || poolRef.current.key !== relayKey) {
    poolRef.current = undefined;

    console.log('[NostrProvider] Creating pool, relays:', relayKey || '(none)');

    if (!relayKey) {
      // No relays — create empty pool, not ready
    }

    const pool = new NPool({
      open(url: string) {
        console.log('[NostrProvider] Opening relay:', url);

        // Resettable auth gate — resets on each reconnect
        let authResolveFn: () => void;
        let authRejectFn: (e: Error) => void;
        let authReady = new Promise<void>((resolve, reject) => {
          authResolveFn = resolve;
          authRejectFn = reject;
        });

        let authTimeout = setTimeout(() => {
          console.log('[NostrProvider] No AUTH challenge — assuming open relay');
          authResolveFn();
          setRelayReadyRef.current(true);
        }, 4000);

        const resetAuth = () => {
          clearTimeout(authTimeout);
          // Create a new promise for the next auth cycle
          authReady = new Promise<void>((resolve, reject) => {
            authResolveFn = resolve;
            authRejectFn = reject;
          });
          authTimeout = setTimeout(() => {
            console.log('[NostrProvider] No AUTH on reconnect — assuming open');
            authResolveFn();
          }, 4000);
        };

        const relay = new NRelay1(url, {
          auth: async (challenge: string) => {
            clearTimeout(authTimeout);
            console.log('[NostrProvider] AUTH challenge received, signing...');

            const signer = signerRef.current;
            if (!signer) {
              const err = new Error('Not logged in');
              authRejectFn(err);
              throw err;
            }

            const event = await signer.signEvent({
              kind: 22242,
              content: '',
              tags: [['relay', url], ['challenge', challenge]],
              created_at: Math.floor(Date.now() / 1000),
            });

            console.log('[NostrProvider] AUTH signed:', event.pubkey);

            // Wait 800ms for relay to process AUTH, then unblock
            setTimeout(() => {
              console.log('[NostrProvider] Relay ready — unblocking queries');
              authResolveFn();
              setRelayReadyRef.current(true);
            }, 800);

            return event;
          },
          log: (entry) => {
            console.log('[NRelay1]', entry);
            // Detect reconnection and reset auth gate
            if (typeof entry === 'object' && entry !== null) {
              const entryStr = JSON.stringify(entry);
              if (entryStr.includes('"open"') || entryStr.includes('reconnect')) {
                resetAuth();
              }
            }
          },
        });

        // Patch req to wait for auth before sending subscriptions
        const originalReq = relay.req.bind(relay);
        relay.req = async function* (filters, opts) {
          console.log('[NostrProvider] REQ waiting for auth...');
          await authReady;
          console.log('[NostrProvider] REQ proceeding:', JSON.stringify(filters));
          yield* originalReq(filters, opts);
        };

        // Patch event to wait for auth before publishing
        const originalEvent = relay.event.bind(relay);
        relay.event = async function(event, opts) {
          console.log('[NostrProvider] EVENT waiting for auth...');
          await authReady;
          console.log('[NostrProvider] EVENT proceeding, kind:', event.kind);
          return originalEvent(event, opts);
        };

        return relay;
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

  // When relay becomes ready, invalidate all nostr queries so they re-run
  useEffect(() => {
    if (relayReady) {
      console.log('[NostrProvider] Relay ready — invalidating all nostr queries');
      queryClient.invalidateQueries({ queryKey: ['nostr'] });
    }
  }, [relayReady, queryClient]);

  return (
    <RelayReadyContext.Provider value={relayReady}>
      <NostrContext.Provider value={{ nostr: poolRef.current!.pool }}>
        {children}
      </NostrContext.Provider>
    </RelayReadyContext.Provider>
  );
};

export default NostrProvider;
