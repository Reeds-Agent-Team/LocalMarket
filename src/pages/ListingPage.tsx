import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { ArrowLeft, MapPin, Tag, MessageSquare, Loader2, Share2, Trash2, Edit, CheckCircle, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Layout } from '@/components/Layout';
import { parseListing } from '@/hooks/useListings';
import { useListing } from '@/hooks/useListings';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { formatSats } from '@/lib/formatSats';
import { NoteContent } from '@/components/NoteContent';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function ListingPage() {
  const { naddr } = useParams<{ naddr: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutateAsync: publish, isPending: isMarking } = useNostrPublish();
  const [imageIndex, setImageIndex] = useState(0);

  // Decode naddr
  let pubkey: string | undefined;
  let identifier: string | undefined;

  try {
    if (naddr) {
      const decoded = nip19.decode(naddr);
      if (decoded.type === 'naddr') {
        pubkey = decoded.data.pubkey;
        identifier = decoded.data.identifier;
      }
    }
  } catch {
    // invalid
  }

  const { data: event, isLoading } = useListing(pubkey, identifier);
  const listing = event ? parseListing(event) : null;
  const author = useAuthor(pubkey);
  const authorMeta = author.data?.metadata;
  const authorName = authorMeta?.name ?? genUserName(pubkey ?? '');
  const isOwner = user?.pubkey === pubkey;

  useSeoMeta({
    title: listing?.title ? `${listing.title} — localmarket` : 'Listing — localmarket',
    description: listing?.summary,
  });

  const handleMarkSold = async () => {
    if (!event || !listing?.d) return;
    try {
      await publish({
        kind: 30402,
        content: event.content,
        tags: event.tags.map(t => t[0] === 'status' ? ['status', 'sold'] : t),
      });
      toast({ title: 'Marked as sold!' });
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    try {
      await publish({
        kind: 5,
        content: '',
        tags: [['e', event.id], ['k', '30402']],
      });
      toast({ title: 'Listing deleted' });
      navigate('/');
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: listing?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!' });
    }
  };

  if (!pubkey || !identifier) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-zinc-300 mb-2">Invalid listing</h2>
          <p className="text-zinc-500 text-sm mb-6">This link doesn't look right.</p>
          <Button asChild variant="outline" className="border-zinc-700 text-zinc-300">
            <Link to="/">Back to Market</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to market
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl bg-zinc-800" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 bg-zinc-800" />
              <Skeleton className="h-5 w-1/2 bg-zinc-800" />
              <Skeleton className="h-10 w-1/3 bg-zinc-800" />
              <Skeleton className="h-20 w-full bg-zinc-800" />
            </div>
          </div>
        ) : !event || !listing ? (
          <div className="text-center py-20">
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">Listing not found</h3>
            <p className="text-zinc-500 text-sm">This item may have been removed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Images */}
            <div className="space-y-3">
              <div className="relative aspect-square bg-zinc-800/50 rounded-xl overflow-hidden">
                {listing.image?.length ? (
                  <>
                    <img
                      src={listing.image[imageIndex]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    {listing.image.length > 1 && (
                      <>
                        <button
                          onClick={() => setImageIndex(i => Math.max(0, i - 1))}
                          disabled={imageIndex === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white disabled:opacity-30 transition"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setImageIndex(i => Math.min((listing.image?.length ?? 1) - 1, i + 1))}
                          disabled={imageIndex === (listing.image?.length ?? 1) - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white disabled:opacity-30 transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {listing.status === 'sold' && (
                      <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center">
                        <Badge className="bg-red-900/80 text-red-300 border-red-700/50 text-base px-4 py-2">SOLD</Badge>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Tag className="w-20 h-20 text-zinc-700" />
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {(listing.image?.length ?? 0) > 1 && (
                <div className="flex gap-2">
                  {listing.image?.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImageIndex(i)}
                      className={cn(
                        'w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                        i === imageIndex ? 'border-violet-500' : 'border-zinc-700 hover:border-zinc-500'
                      )}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {listing.categories?.map(cat => (
                    <Badge key={cat} variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700/50 capitalize text-xs">
                      {cat}
                    </Badge>
                  ))}
                  {listing.status === 'sold' && (
                    <Badge className="bg-red-900/50 text-red-400 border-red-800/50 text-xs">SOLD</Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-zinc-100 mb-1">{listing.title}</h1>
                {listing.summary && (
                  <p className="text-zinc-400 text-sm">{listing.summary}</p>
                )}
              </div>

              {/* Price */}
              {listing.price && (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-violet-400">
                    {formatSats(listing.price.amount, listing.price.currency)}
                  </span>
                  <span className="text-zinc-400 text-sm font-medium">
                    {listing.price.currency.toUpperCase()}
                    {listing.price.frequency && ` / ${listing.price.frequency}`}
                  </span>
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-sm text-zinc-500">
                {listing.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {listing.location}
                  </span>
                )}
                <span>
                  Listed {formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true })}
                </span>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Seller */}
              <div className="flex items-center gap-3">
                <Link to={`/profile/${pubkey}`}>
                  <Avatar className="w-10 h-10 ring-2 ring-zinc-700 hover:ring-violet-500 transition-all">
                    <AvatarImage src={authorMeta?.picture} />
                    <AvatarFallback className="bg-zinc-800 text-sm">
                      <User className="w-5 h-5 text-zinc-500" />
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link to={`/profile/${pubkey}`} className="font-medium text-zinc-200 hover:text-violet-300 transition-colors">
                    {authorName}
                  </Link>
                  {authorMeta?.nip05 && (
                    <p className="text-xs text-zinc-500">{authorMeta.nip05}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!isOwner && listing.status !== 'sold' && (
                <Button
                  asChild
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30"
                >
                  <Link to={`/messages/${pubkey}`} state={{ subject: listing.title }}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message Seller
                  </Link>
                </Button>
              )}

              {isOwner && (
                <div className="flex gap-2">
                  {listing.status !== 'sold' && (
                    <Button
                      onClick={handleMarkSold}
                      disabled={isMarking}
                      variant="outline"
                      className="flex-1 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/30"
                    >
                      {isMarking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Mark Sold
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="border-red-700/50 text-red-400 hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-zinc-100">Delete listing?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This will broadcast a deletion request. The listing may still be visible on some relays.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-700 hover:bg-red-600 text-white"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="w-full border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Listing
              </Button>
            </div>
          </div>
        )}

        {/* Description */}
        {event && listing && listing && event.content && (
          <div className="mt-10">
            <Separator className="bg-zinc-800 mb-6" />
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Description</h2>
            <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
              <NoteContent event={event} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
