import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthenticatedImage } from '@/hooks/useAuthenticatedImage';
import { cn } from '@/lib/utils';

interface AuthenticatedAvatarProps {
  src?: string;
  fallback: React.ReactNode;
  className?: string;
}

/**
 * Avatar that fetches the image with NIP-98 auth if it's from the
 * configured Blossom server, otherwise loads normally.
 */
export function AuthenticatedAvatar({ src, fallback, className }: AuthenticatedAvatarProps) {
  const { src: resolvedSrc } = useAuthenticatedImage(src);

  return (
    <Avatar className={cn(className)}>
      <AvatarImage src={resolvedSrc ?? undefined} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
