import React, { useEffect, useRef } from 'react';
import { NostrEvent, NostrFilter, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { NUser, useNostrLogin } from '@nostrify/react/login';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();
  const { logins } = useNostrLogin();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data without recreating the pool
  const relayMetadata = useRef(config.relayMetadata);

  // Derive signer from the first login — stored in a ref so the auth
  // callback always uses the latest signer without recreating NPool
  const signerRef = useRef<NUser['signer'] | undefined>(undefined);

  useEffect(() => {
    try {
      const login = logins[0];
      if (login) {
        // Build a minimal signer from the first login
        // NUser.fromNsecLogin / fromExtensionLogin etc all expose .signer
        const user = login.type === 'nsec'
          ? NUser.fromNsecLogin(login)
          : login.type === 'extension'
          ? NUser.fromExtensionLogin(login)
          : undefined;
        signerRef.current = user?.signer;
      } else {
        signerRef.current = undefined;
      }
    } catch {
      signerRef.current = undefined;
    }
  }, [logins]);

  // Invalidate Nostr queries when relay metadata changes
  useEffect(() => {
    relayMetadata.current = config.relayMetadata;
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [config.relayMetadata, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url, {
          // NIP-42: sign AUTH challenges with the current user's signer
          auth: async (challenge: string) => {
            const signer = signerRef.current;
            if (!signer) {
              throw new Error('No signer available for NIP-42 auth');
            }
            return signer.signEvent({
              kind: 22242,
              content: '',
              tags: [
                ['relay', url],
                ['challenge', challenge],
              ],
              created_at: Math.floor(Date.now() / 1000),
            });
          },
        });
      },
      reqRouter(filters: NostrFilter[]) {
        const routes = new Map<string, NostrFilter[]>();

        const readRelays = relayMetadata.current.relays
          .filter(r => r.read)
          .map(r => r.url);

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
      eoseTimeout: 200,
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;
