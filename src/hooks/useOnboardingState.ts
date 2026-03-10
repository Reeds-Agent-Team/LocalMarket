import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export type OnboardingStep =
  | 'identity'   // No user logged in — show login/signup
  | 'relay'      // User exists but no relay configured — show QR scan
  | 'complete';  // Both user + relay — go to app

export function useOnboardingState(): OnboardingStep {
  const { config } = useAppContext();
  const { user } = useCurrentUser();

  const hasRelay = config.relayMetadata.relays.length > 0;
  const hasUser = Boolean(user);

  if (!hasUser) return 'identity';
  if (!hasRelay) return 'relay';
  return 'complete';
}
