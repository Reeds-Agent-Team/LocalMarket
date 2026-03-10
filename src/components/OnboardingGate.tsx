import { ReactNode } from 'react';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';

interface OnboardingGateProps {
  children: ReactNode;
}

/**
 * Intercepts the app and shows the onboarding flow if the user
 * hasn't set up their identity or scanned a relay QR yet.
 */
export function OnboardingGate({ children }: OnboardingGateProps) {
  const step = useOnboardingState();

  if (step !== 'complete') {
    return <OnboardingShell />;
  }

  return <>{children}</>;
}
