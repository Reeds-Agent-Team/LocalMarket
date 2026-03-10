import { useParams, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { MessageSquare, Globe, AtSign, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Layout } from '@/components/Layout';
import { ListingCard } from '@/components/ListingCard';
import { useAuthor } from '@/hooks/useAuthor';
import { useListings } from '@/hooks/useListings';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';

export function ProfilePage() {
  const { npub } = useParams<{ npub: string }>();
  const { user } = useCurrentUser();

  // Resolve pubkey from npub or raw hex
  let pubkey: string | undefined;
  try {
    if (npub?.startsWith('npub1')) {
      const decoded = nip19.decode(npub);
      if (decoded.type === 'npub') pubkey = decoded.data;
    } else if (npub?.match(/^[0-9a-f]{64}$/)) {
      pubkey = npub;
    }
  } catch {
    // invalid
  }

  const author = useAuthor(pubkey);
  const authorMeta = author.data?.metadata;
  const displayName = authorMeta?.name ?? genUserName(pubkey ?? '');
  const isOwn = user?.pubkey === pubkey;

  const { data: listings, isLoading: listingsLoading } = useListings({
    authors: pubkey ? [pubkey] : undefined,
    limit: 50,
  });

  useSeoMeta({
    title: `${displayName} — localmarket`,
    description: authorMeta?.about,
  });

  if (!pubkey) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-zinc-300">Invalid profile link</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end mb-8">
          {/* Banner / avatar */}
          <div className="relative">
            {authorMeta?.banner ? (
              <div className="w-full h-32 rounded-xl overflow-hidden mb-0 sm:hidden">
                <img src={authorMeta.banner} alt="" className="w-full h-full object-cover" />
              </div>
            ) : null}
            <Avatar className="w-20 h-20 ring-4 ring-zinc-900 border-2 border-zinc-700">
              <AvatarImage src={authorMeta?.picture} />
              <AvatarFallback className="bg-zinc-800 text-xl">
                <User className="w-10 h-10 text-zinc-500" />
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                {author.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-40 bg-zinc-800" />
                    <Skeleton className="h-4 w-32 bg-zinc-800" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-zinc-100">{displayName}</h1>
                    {authorMeta?.nip05 && (
                      <div className="flex items-center gap-1 text-sm text-zinc-500 mt-0.5">
                        <AtSign className="w-3.5 h-3.5" />
                        {authorMeta.nip05}
                      </div>
                    )}
                  </>
                )}
              </div>
              {!isOwn && pubkey && (
                <Button
                  asChild
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-500 text-white shrink-0"
                >
                  <Link to={`/messages/${pubkey}`}>
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Message
                  </Link>
                </Button>
              )}
            </div>

            {authorMeta?.about && (
              <p className="text-sm text-zinc-400 mt-3 max-w-xl">{authorMeta.about}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3">
              {authorMeta?.website && (
                <a
                  href={authorMeta.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-violet-400 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {authorMeta.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <Badge variant="secondary" className="bg-zinc-800/60 text-zinc-500 border-zinc-700/40 text-xs font-mono">
                {pubkey.slice(0, 8)}…{pubkey.slice(-6)}
              </Badge>
            </div>
          </div>
        </div>

        <Separator className="bg-zinc-800 mb-8" />

        {/* Listings */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-200 mb-5">
            Listings
            {listings && (
              <span className="ml-2 text-sm font-normal text-zinc-500">({listings.length})</span>
            )}
          </h2>

          {listingsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full bg-zinc-800" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                    <Skeleton className="h-3 w-full bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings?.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-zinc-800">
              <p className="text-zinc-500 text-sm">No listings yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings?.map(event => (
                <ListingCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
