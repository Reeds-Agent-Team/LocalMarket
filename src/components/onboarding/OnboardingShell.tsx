import { ShoppingBag } from 'lucide-react';
import { OnboardingIdentity } from './OnboardingIdentity';
import { OnboardingRelay } from './OnboardingRelay';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { cn } from '@/lib/utils';

export function OnboardingShell() {
  const step = useOnboardingState();

  const isIdentityStep = step === 'identity';
  const isRelayStep = step === 'relay';

  const stepNumber = isIdentityStep ? 1 : 2;

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
        <StepDot number={1} active={stepNumber >= 1} done={stepNumber > 1} label="Identity" />
        <div className={cn(
          'h-px w-8 transition-colors duration-500',
          stepNumber > 1 ? 'bg-violet-500' : 'bg-zinc-700'
        )} />
        <StepDot number={2} active={stepNumber >= 2} done={false} label="Join market" />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/60 p-6 shadow-xl">
          {isIdentityStep && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-100">Who are you?</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Set up your identity. No email, no passwords — just a name and a cryptographic key.
                </p>
              </div>
              <OnboardingIdentity onComplete={() => {}} />
            </>
          )}

          {isRelayStep && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-100">Scan to join</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Ask the market host for their QR code, then scan it to connect.
                </p>
              </div>
              <OnboardingRelay onComplete={() => {}} />
            </>
          )}
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
