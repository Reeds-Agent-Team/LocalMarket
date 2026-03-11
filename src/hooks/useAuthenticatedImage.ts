import { useState, useEffect, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';

/**
 * Fetches a Blossom image with BUD-11 auth (kind 24242) and returns a local blob URL.
 *
 * Blossom GET auth requires kind 24242 with:
 *   - t: "get"
 *   - expiration: unix timestamp in the future
 *   - x: sha256 hash (optional but good practice)
 *
 * This is different from NIP-98 (kind 27235) which is for general HTTP auth.
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
  const needsAuth = Boolean(src && blossomServer && src.startsWith(blossomServer));

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
        const now = Math.floor(Date.now() / 1000);

        // Extract sha256 from URL path — Blossom URLs are /<sha256>[.ext]
        const sha256Match = src.match(/\/([a-f0-9]{64})(\.[^/]+)?$/);
        const sha256 = sha256Match?.[1];

        // Build BUD-11 auth event (kind 24242, t=get, expiration required)
        const tags: string[][] = [
          ['t', 'get'],
          ['expiration', String(now + 60)], // valid for 60 seconds
        ];
        if (sha256) {
          tags.push(['x', sha256]);
        }

        const authEvent = await user.signer.signEvent({
          kind: 24242,
          content: 'Get Blob',
          tags,
          created_at: now,
        });

        // Base64url encode (Blossom spec says base64url without padding)
        const authHeader = 'Nostr ' + btoa(JSON.stringify(authEvent))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const response = await fetch(src, {
          headers: { Authorization: authHeader },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();

        if (cancelled) return;

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

    return () => { cancelled = true; };
  }, [src, needsAuth, user]); // eslint-disable-line react-hooks/exhaustive-deps

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
