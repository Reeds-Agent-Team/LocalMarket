import { useEffect, useRef } from 'react';
import { NPool, NRelay1 } from '@nostrify/nostrify';
import { NSchema as n } from '@nostrify/nostrify';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAppContext } from '@/hooks/useAppContext';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Silently fetches the user's existing Nostr profile (kind 0) from
 * well-known public relays when they first log in with an existing nsec.
 *
 * Rules:
 * - Only runs once per session per pubkey (tracked in sessionStorage)
 * - Only imports if no kind 0 exists yet on the local relay
 * - NEVER overwrites an existing profile on the local relay
 * - NEVER touches follow lists, relay lists, or any other event kinds
 * - Publishes the imported kind 0 to the local relay so it's available
 */

const BOOTSTRAP_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
];

export function ProfileImport() {
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { mutateAsync: publish } = useNostrPublish();
  const queryClient = useQueryClient();
  const attempted = useRef(false);

  const localRelayUrl = config.relayMetadata.relays[0]?.url;

  useEffect(() => {
    if (!user || !localRelayUrl) return;
    if (attempted.current) return;

    const sessionKey = `localmarket:profile-imported:${user.pubkey}`;
    if (sessionStorage.getItem(sessionKey)) return;

    attempted.current = true;
    sessionStorage.setItem(sessionKey, '1');

    const importProfile = async () => {
      try {
        // Step 0: Check for a pending profile from onboarding (new user flow).
        // This is set during identity step before the relay was connected.
        const pendingProfileRaw = localStorage.getItem('localmarket:pending-profile');
        if (pendingProfileRaw) {
          try {
            const pendingMetadata = JSON.parse(pendingProfileRaw);
            localStorage.removeItem('localmarket:pending-profile');
            console.log('[ProfileImport] Publishing pending onboarding profile...');
            await publish({
              kind: 0,
              content: JSON.stringify(pendingMetadata),
              tags: [],
            });
            // Invalidate all author queries (key includes relay URL which we don't need to specify)
            queryClient.invalidateQueries({ queryKey: ['nostr', 'author'] });
            // Also clear the session key so useAuthor re-runs
            sessionStorage.removeItem(`localmarket:profile-imported:${user.pubkey}`);
            console.log('[ProfileImport] Pending profile published successfully');
          } catch (err) {
            console.warn('[ProfileImport] Failed to publish pending profile:', err);
          }
          return; // Don't run the public relay import flow for new users
        }

        // Step 1: Check if the local relay already has a kind 0 for this user
        const localRelay = new NRelay1(localRelayUrl);
        let hasLocalProfile = false;

        try {
          const localEvents = await localRelay.query(
            [{ kinds: [0], authors: [user.pubkey], limit: 1 }],
            { signal: AbortSignal.timeout(4000) }
          );
          hasLocalProfile = localEvents.length > 0;
        } catch {
          // Can't check local relay — skip import to be safe
          return;
        }

        if (hasLocalProfile) {
          console.log('[ProfileImport] Local relay already has profile, skipping import');
          return;
        }

        // Step 2: Fetch kind 0 from public bootstrap relays
        console.log('[ProfileImport] No local profile found, fetching from public relays...');

        const bootstrapPool = new NPool({
          open: (url) => new NRelay1(url),
          reqRouter: (filters) => {
            const routes = new Map();
            for (const url of BOOTSTRAP_RELAYS) {
              routes.set(url, filters);
            }
            return routes;
          },
          eventRouter: () => [],
          eoseTimeout: 3000,
        });

        const events = await bootstrapPool.query(
          [{ kinds: [0], authors: [user.pubkey], limit: 1 }],
          { signal: AbortSignal.timeout(6000) }
        );

        if (events.length === 0) {
          console.log('[ProfileImport] No profile found on public relays');
          return;
        }

        const profileEvent = events[0];

        // Step 3: Validate it's a real profile event with parseable content
        try {
          n.json().pipe(n.metadata()).parse(profileEvent.content);
        } catch {
          console.log('[ProfileImport] Profile event has invalid content, skipping');
          return;
        }

        // Step 4: Publish ONLY the kind 0 to the local relay
        // We re-sign it as the current user (the event we fetched is signed
        // by the user's key already, but we need to go through our signer)
        console.log('[ProfileImport] Importing profile to local relay...');

        await publish({
          kind: 0,
          content: profileEvent.content,
          tags: profileEvent.tags.filter(([t]) =>
            // Only carry over safe, non-sensitive tags
            // Explicitly exclude: p (follows), e, a, relay-related tags
            !['p', 'e', 'a', 'r', 'relay'].includes(t)
          ),
          created_at: profileEvent.created_at,
        });

        // Invalidate author cache so the profile shows up immediately
        queryClient.invalidateQueries({ queryKey: ['nostr', 'author'] });
        console.log('[ProfileImport] Profile imported successfully');

      } catch (err) {
        console.warn('[ProfileImport] Import failed (non-critical):', err);
      }
    };

    // Small delay so the app finishes initialising first
    const timer = setTimeout(importProfile, 2000);
    return () => clearTimeout(timer);

  }, [user?.pubkey, localRelayUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  return null; // renders nothing
}
