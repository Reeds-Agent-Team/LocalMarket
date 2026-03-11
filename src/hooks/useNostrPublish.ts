import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";

import type { NostrEvent } from "@nostrify/nostrify";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useNostrPublish(): UseMutationResult<NostrEvent> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (t: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>) => {
      if (!user) {
        throw new Error("User is not logged in");
      }

      const tags = t.tags ?? [];

      // Add the client tag if it doesn't exist
      if (location.protocol === "https:" && !tags.some(([name]) => name === "client")) {
        tags.push(["client", location.hostname]);
      }

      const event = await user.signer.signEvent({
        kind: t.kind,
        content: t.content ?? "",
        tags,
        created_at: t.created_at ?? Math.floor(Date.now() / 1000),
      });

      // Retry up to 3 times with backoff — handles the window between
      // NIP-42 auth completing and zooid processing the join request
      const delays = [0, 2000, 5000];
      let lastError: unknown;

      for (const delay of delays) {
        if (delay > 0) await sleep(delay);
        try {
          await nostr.event(event, { signal: AbortSignal.timeout(8000) });
          return event;
        } catch (err) {
          lastError = err;
          const msg = String(err);
          // Only retry on relay rejection errors, not on network/timeout errors
          if (
            msg.includes('restricted') ||
            msg.includes('auth-required') ||
            msg.includes('All promises were rejected')
          ) {
            console.warn(`[useNostrPublish] Publish failed (will retry): ${msg}`);
            continue;
          }
          // Non-retriable error — throw immediately
          throw err;
        }
      }

      throw lastError;
    },
    onError: (error) => {
      console.error("Failed to publish event:", error);
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
    },
  });
}
