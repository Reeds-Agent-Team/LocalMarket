import { NostrEvent } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { MapPin, Tag, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { parseListing } from '@/hooks/useListings';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import { formatSats } from '@/lib/formatSats';
import { AuthenticatedImage } from '@/components/AuthenticatedImage';
import { AuthenticatedAvatar } from '@/components/AuthenticatedAvatar';

interface ListingCardProps {
  event: NostrEvent;
  className?: string;
}

export function ListingCard({ event, className }: ListingCardProps) {
  const listing = parseListing(event);
  const author = useAuthor(event.pubkey);
  const authorMeta = author.data?.metadata;
  const displayName = authorMeta?.name ?? genUserName(event.pubkey);

  // Build naddr for linking
  const naddr = nip19.naddrEncode({
    kind: event.kind,
    pubkey: event.pubkey,
    identifier: listing.d ?? '',
  });

  const isSold = listing.status === 'sold';

  return (
    <Link
      to={`/listing/${naddr}`}
      className={cn(
        'group block rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden',
        'hover:border-violet-500/40 hover:bg-zinc-900 transition-all duration-200',
        'hover:shadow-lg hover:shadow-violet-900/10',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-zinc-800/50 overflow-hidden">
        {listing.image?.[0] ? (
          <AuthenticatedImage
            src={listing.image[0]}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag className="w-12 h-12 text-zinc-700" />
          </div>
        )}
        {isSold && (
          <div className="absolute inset-0 bg-zinc-950/70 flex items-center justify-center">
            <Badge variant="secondary" className="bg-red-900/80 text-red-300 border-red-700/50 text-sm font-semibold px-3 py-1">
              SOLD
            </Badge>
          </div>
        )}
        {listing.categories?.[0] && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-zinc-900/80 text-zinc-300 border-zinc-700/50 backdrop-blur-sm text-xs">
              {listing.categories[0]}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-zinc-100 line-clamp-1 group-hover:text-violet-300 transition-colors">
            {listing.title}
          </h3>
          {listing.summary && (
            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
              {listing.summary}
            </p>
          )}
        </div>

        {/* Price */}
        {listing.price && (
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-violet-400">
              {formatSats(listing.price.amount, listing.price.currency)}
            </span>
            <span className="text-xs text-zinc-500">
              {listing.price.currency.toUpperCase()}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
          <div className="flex items-center gap-2">
            <AuthenticatedAvatar
              src={authorMeta?.picture}
              className="w-5 h-5"
              fallback={<User className="w-3 h-3 text-zinc-500" />}
            />
            <span className="text-xs text-zinc-500 truncate max-w-[100px]">{displayName}</span>
          </div>
          {listing.location && (
            <div className="flex items-center gap-1 text-xs text-zinc-600">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{listing.location}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
