import { ShoppingBag } from 'lucide-react';
import { OnboardingIdentity } from './OnboardingIdentity';
import { OnboardingRelay } from './OnboardingRelay';
import { OnboardingProfile } from './OnboardingProfile';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { cn } from '@/lib/utils';

export function OnboardingShell() {
  const step = useOnboardingState();

  const stepNumber = step === 'identity' ? 1 : step === 'relay' ? 2 : 3;
  const isNewUser = step === 'profile' || localStorage.getItem('localmarket:new-user') === '1';

  // Step indicators — 2 for returning users, 3 for new users
  const steps = isNewUser
    ? ['Identity', 'Join market', 'Profile']
    : ['Identity', 'Join market'];

  const titles: Record<string, { heading: string; sub: string }> = {
    identity: {
      heading: 'Who are you?',
      sub: 'New here? We\'ll generate a key for you. Already have one? Paste it in.',
    },
    relay: {
      heading: 'Scan to join',
      sub: 'Ask the market host for their QR code, then scan it to connect.',
    },
    profile: {
      heading: 'Set up your profile',
      sub: 'Let others know who you are. You can always update this later.',
    },
  };

  const { heading, sub } = titles[step] ?? titles.identity;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-start px-5 py-10 safe-area-inset">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-900/40">
          <ShoppingBag className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            local<span className="text-violet-400">market</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your private local market</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div className={cn(
                'h-px w-8 transition-colors duration-500',
                stepNumber > i + 1 ? 'bg-violet-500' : stepNumber === i + 1 ? 'bg-violet-500' : 'bg-zinc-700'
              )} />
            )}
            <StepDot
              number={i + 1}
              active={stepNumber >= i + 1}
              done={stepNumber > i + 1}
              label={label}
            />
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/60 p-6 shadow-xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">{heading}</h2>
            <p className="text-sm text-zinc-400 mt-1">{sub}</p>
          </div>

          {step === 'identity' && <OnboardingIdentity onComplete={() => {}} />}
          {step === 'relay' && <OnboardingRelay onComplete={() => {}} />}
          {step === 'profile' && <OnboardingProfile onComplete={() => {}} />}
        </div>
      </div>
    </div>
  );
}

function StepDot({
  number,
  active,
  done,
  label,
}: {
  number: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500',
          done
            ? 'bg-violet-600 text-white'
            : active
            ? 'bg-violet-600 text-white ring-4 ring-violet-600/20'
            : 'bg-zinc-800 text-zinc-500'
        )}
      >
        {done ? '✓' : number}
      </div>
      <span className={cn(
        'text-xs transition-colors',
        active ? 'text-zinc-300' : 'text-zinc-600'
      )}>
        {label}
      </span>
    </div>
  );
}
