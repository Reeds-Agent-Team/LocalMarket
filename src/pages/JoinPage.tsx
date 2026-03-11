import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ShoppingBag } from 'lucide-react';
import { parseInviteLink } from '@/lib/parseInviteLink';
import { useAppContext } from '@/hooks/useAppContext';
import { useOnboardingState } from '@/hooks/useOnboardingState';

/**
 * Deep-link handler for invite QR codes.
 * URL format: /join?r=wss://relay.example.com&c=CLAIMCODE
 *
 * If the user hasn't completed onboarding yet, stores the invite data
 * in sessionStorage so the onboarding flow can pick it up.
 * If the user is already set up, saves the new relay directly.
 */
export function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateConfig } = useAppContext();
  const step = useOnboardingState();

  useEffect(() => {
    const raw = window.location.href;
    const invite = parseInviteLink(raw);

    if (!invite) {
      navigate('/', { replace: true });
      return;
    }

    // Store invite in sessionStorage so the onboarding QR step can pre-fill it
    sessionStorage.setItem('localmarket:pending-invite', JSON.stringify(invite));

    // Redirect to onboarding or home — the appropriate step will handle it
    navigate('/', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
        <ShoppingBag className="w-7 h-7 text-white" />
      </div>
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      <p className="text-zinc-400 text-sm">Opening invite…</p>
    </div>
  );
}
