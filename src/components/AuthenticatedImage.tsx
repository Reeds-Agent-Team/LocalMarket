import { forwardRef } from 'react';
import { useAuthenticatedImage } from '@/hooks/useAuthenticatedImage';
import { cn } from '@/lib/utils';

interface AuthenticatedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: React.ReactNode;
}

/**
 * Drop-in replacement for <img> that automatically adds NIP-98 auth
 * headers when loading images from the configured Blossom server.
 * For all other image sources, behaves exactly like a normal <img>.
 */
export const AuthenticatedImage = forwardRef<HTMLImageElement, AuthenticatedImageProps>(
  ({ src, alt, className, fallback, ...props }, ref) => {
    const { src: resolvedSrc, isLoading, error } = useAuthenticatedImage(src);

    if (error && fallback) {
      return <>{fallback}</>;
    }

    if (!resolvedSrc || isLoading) {
      return (
        <div
          className={cn('bg-zinc-800 animate-pulse', className)}
          style={props.style}
        />
      );
    }

    return (
      <img
        ref={ref}
        src={resolvedSrc}
        alt={alt}
        className={className}
        {...props}
      />
    );
  }
);

AuthenticatedImage.displayName = 'AuthenticatedImage';
