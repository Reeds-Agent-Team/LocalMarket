import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { Layout } from '@/components/Layout';
import { DMMessagingInterface } from '@/components/dm/DMMessagingInterface';
import { DMProvider } from '@/components/DMProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';
import { MessageSquare } from 'lucide-react';

export function MessagesPage() {
  useSeoMeta({ title: 'Messages — zooidmarket' });
  const { npub } = useParams<{ npub?: string }>();
  const { user } = useCurrentUser();
  const location = useLocation();

  // Resolve initial pubkey from URL param
  let initialPubkey: string | undefined;
  try {
    if (npub?.startsWith('npub1')) {
      const decoded = nip19.decode(npub);
      if (decoded.type === 'npub') initialPubkey = decoded.data;
    } else if (npub?.match(/^[0-9a-f]{64}$/)) {
      initialPubkey = npub;
    }
  } catch {
    // ignore
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-200 mb-3">Sign in to view messages</h2>
          <p className="text-zinc-400 text-sm mb-8">
            Encrypted private messages via Nostr NIP-17.
          </p>
          <LoginArea className="max-w-xs mx-auto" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-4rem-4rem)] md:h-[calc(100vh-4rem)] flex flex-col">
        <h1 className="text-xl font-bold text-zinc-100 mb-4">Messages</h1>
        <DMProvider>
          <DMMessagingInterface className="flex-1 min-h-0" />
        </DMProvider>
      </div>
    </Layout>
  );
}
