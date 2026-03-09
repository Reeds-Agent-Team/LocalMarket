import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, Wifi, WifiOff, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Layout } from '@/components/Layout';
import { ListingCard } from '@/components/ListingCard';
import { useListings } from '@/hooks/useListings';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { RelayStatusBadge } from '@/components/RelayStatusBadge';
import { parseListing } from '@/hooks/useListings';

const CATEGORIES = ['all', 'electronics', 'clothing', 'tools', 'food', 'books', 'services', 'other'];

const Index = () => {
  useSeoMeta({
    title: 'zooidmarket — Private Nostr Marketplace',
    description: 'A private, local-relay-only marketplace powered by Nostr.',
  });

  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: listings, isLoading, error } = useListings({
    categories: activeCategory !== 'all' ? [activeCategory] : undefined,
    limit: 100,
  });

  const relayUrl = config.relayMetadata.relays[0]?.url ?? 'not configured';

  const filtered = (listings ?? []).filter(event => {
    if (!search) return true;
    const l = parseListing(event);
    const q = search.toLowerCase();
    return (
      l.title?.toLowerCase().includes(q) ||
      l.summary?.toLowerCase().includes(q) ||
      l.location?.toLowerCase().includes(q) ||
      l.categories?.some(c => c.toLowerCase().includes(q))
    );
  });

  return (
    <Layout>
      {/* Hero */}
      <div className="border-b border-zinc-800/60 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <RelayStatusBadge relayUrl={relayUrl} />
              </div>
              <h1 className="text-3xl font-bold text-zinc-100 mb-1">
                Private Marketplace
              </h1>
              <p className="text-zinc-400 text-sm">
                Buy &amp; sell within your group — private, censorship-resistant, Bitcoin-native.
              </p>
            </div>
            {user && (
              <Button asChild className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30 self-start md:self-auto">
                <Link to="/listing/new">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  List an Item
                </Link>
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search listings…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-zinc-800/60 border-zinc-700/60 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 h-11"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category filters */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-zinc-500 shrink-0" />
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                  activeCategory === cat
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listings grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full bg-zinc-800" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                  <Skeleton className="h-3 w-full bg-zinc-800" />
                  <Skeleton className="h-3 w-2/3 bg-zinc-800" />
                  <Skeleton className="h-5 w-1/3 bg-zinc-800 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <WifiOff className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">Can't reach relay</h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-6">
              Could not connect to <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{relayUrl}</code>.<br />
              Make sure your local zooid relay is running.
            </p>
            <Button asChild variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              <Link to="/settings">Configure Relay</Link>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">
              {search ? 'No results found' : 'No listings yet'}
            </h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-6">
              {search
                ? `No listings match "${search}". Try a different search.`
                : 'Be the first to list something in your group market.'}
            </p>
            {user && !search && (
              <Button asChild className="bg-violet-600 hover:bg-violet-500">
                <Link to="/listing/new">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create First Listing
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-zinc-500">
                {filtered.length} listing{filtered.length !== 1 ? 's' : ''}
                {activeCategory !== 'all' && ` in ${activeCategory}`}
                {search && ` matching "${search}"`}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map(event => (
                <ListingCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800/40 py-6 text-center">
        <p className="text-xs text-zinc-600">
          <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">
            Vibed with Shakespeare
          </a>
        </p>
      </div>
    </Layout>
  );
};

export default Index;
