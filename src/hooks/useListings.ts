import { NostrEvent } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export interface ListingTag {
  title?: string;
  summary?: string;
  price?: { amount: string; currency: string; frequency?: string };
  location?: string;
  image?: string[];
  status?: string;
  categories?: string[];
  d?: string;
}

export function parseListing(event: NostrEvent): ListingTag {
  const tags = event.tags;

  const get = (name: string) => tags.find(([n]) => n === name)?.[1];
  const getAll = (name: string) => tags.filter(([n]) => n === name).map(t => t[1]);

  const priceTag = tags.find(([n]) => n === 'price');
  const price = priceTag
    ? { amount: priceTag[1], currency: priceTag[2] ?? 'BTC', frequency: priceTag[3] }
    : undefined;

  return {
    d: get('d'),
    title: get('title'),
    summary: get('summary'),
    price,
    location: get('location'),
    image: getAll('image'),
    status: get('status') ?? 'active',
    categories: getAll('t'),
  };
}

export function validateListing(event: NostrEvent): boolean {
  if (event.kind !== 30402) return false;
  const tags = event.tags;
  const d = tags.find(([n]) => n === 'd')?.[1];
  const title = tags.find(([n]) => n === 'title')?.[1];
  return Boolean(d && title);
}

interface UseListingsOptions {
  categories?: string[];
  authors?: string[];
  limit?: number;
}

export function useListings(options: UseListingsOptions = {}) {
  const { nostr } = useNostr();
  const { categories, authors, limit = 50 } = options;

  return useQuery({
    queryKey: ['nostr', 'listings', { categories, authors, limit }],
    queryFn: async ({ signal }) => {
      const filter: Record<string, unknown> = {
        kinds: [30402],
        limit,
      };

      if (authors?.length) {
        filter['authors'] = authors;
      }

      if (categories?.length) {
        filter['#t'] = categories;
      }

      const events = await nostr.query(
        [filter as Parameters<typeof nostr.query>[0][0]],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
      );

      return events.filter(validateListing);
    },
    staleTime: 30000,
  });
}

export function useListing(pubkey: string | undefined, identifier: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nostr', 'listing', pubkey, identifier],
    queryFn: async ({ signal }) => {
      if (!pubkey || !identifier) return null;

      const events = await nostr.query(
        [{ kinds: [30402], authors: [pubkey], '#d': [identifier], limit: 1 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
      );

      const event = events[0];
      if (!event || !validateListing(event)) return null;

      return event;
    },
    enabled: Boolean(pubkey && identifier),
    staleTime: 30000,
  });
}
