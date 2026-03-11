import { useState, useEffect, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';

/**
 * Fetches a Blossom image with NIP-98 HTTP Auth and returns a local blob URL.
 * Required because zooid's Blossom server requires auth on every GET request.
 */
export function useAuthenticatedImage(src: string | undefined) {
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const prevBlobUrl = useRef<string | null>(null);

  const blossomServer = config.blossomServer;

  // Only intercept images from our Blossom server — pass through everything else
  const needsAuth = src && blossomServer && src.startsWith(blossomServer);

  useEffect(() => {
    if (!src) return;

    // Not our Blossom server — use directly
    if (!needsAuth) {
      setBlobUrl(src);
      return;
    }

    if (!user) {
      setError(true);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(false);

    const fetchImage = async () => {
      try {
        // Build NIP-98 auth event for this specific URL
        const now = Math.floor(Date.now() / 1000);
        const authEvent = await user.signer.signEvent({
          kind: 27235,
          content: '',
          tags: [
            ['u', src],
            ['method', 'GET'],
          ],
          created_at: now,
        });

        const authHeader = 'Nostr ' + btoa(JSON.stringify(authEvent));

        const response = await fetch(src, {
          headers: { Authorization: authHeader },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();

        if (cancelled) {
          URL.revokeObjectURL(URL.createObjectURL(blob));
          return;
        }

        // Revoke previous blob URL to avoid memory leaks
        if (prevBlobUrl.current) {
          URL.revokeObjectURL(prevBlobUrl.current);
        }

        const url = URL.createObjectURL(blob);
        prevBlobUrl.current = url;
        setBlobUrl(url);
      } catch (err) {
        if (!cancelled) {
          console.warn('[useAuthenticatedImage] Failed to load:', src, err);
          setError(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchImage();

    return () => {
      cancelled = true;
    };
  }, [src, needsAuth, user]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current);
      }
    };
  }, []);

  return { src: blobUrl, isLoading, error };
}
