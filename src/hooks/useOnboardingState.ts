import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export type OnboardingStep =
  | 'identity'  // No user logged in — show keypair gen or nsec login
  | 'relay'     // User exists but no relay configured — show QR scan
  | 'profile'   // New user, relay connected, no profile set yet — show profile setup
  | 'complete'; // Everything set — go to app

export function useOnboardingState(): OnboardingStep {
  const { config } = useAppContext();
  const { user } = useCurrentUser();

  const hasRelay = config.relayMetadata.relays.length > 0;
  const hasUser = Boolean(user);

  // Flag set in localStorage when a brand-new keypair is generated
  // Cleared once the profile step is completed
  const isNewUser = localStorage.getItem('localmarket:new-user') === '1';

  if (!hasUser) return 'identity';
  if (!hasRelay) return 'relay';
  if (isNewUser) return 'profile';
  return 'complete';
}
