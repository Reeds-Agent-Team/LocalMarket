import { type NostrEvent, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

export function useAuthor(pubkey: string | undefined) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  const relayUrl = config.relayMetadata.relays[0]?.url ?? null;
  const hasRelay = Boolean(relayUrl);

  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    // Include relay URL in key so cache invalidates when relay changes
    queryKey: ['nostr', 'author', relayUrl, pubkey ?? ''],
    enabled: hasRelay && Boolean(pubkey),
    queryFn: async () => {
      if (!pubkey) return {};

      const [event] = await nostr.query(
        [{ kinds: [0], authors: [pubkey], limit: 1 }],
        { signal: AbortSignal.timeout(8000) },
      );

      if (!event) {
        throw new Error('No event found');
      }

      try {
        const metadata = n.json().pipe(n.metadata()).parse(event.content);
        return { metadata, event };
      } catch {
        return { event };
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
