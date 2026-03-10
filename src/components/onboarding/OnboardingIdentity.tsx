import { useState } from 'react';
import { generateSecretKey, nip19 } from 'nostr-tools';
import { Loader2, Eye, EyeOff, Copy, Check, UserPlus, KeyRound, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

type Tab = 'new' | 'returning';

interface OnboardingIdentityProps {
  onComplete: () => void;
}

export function OnboardingIdentity({ onComplete }: OnboardingIdentityProps) {
  const [tab, setTab] = useState<Tab>('new');

  return (
    <div className="w-full">
      {/* Tab switcher */}
      <div className="flex rounded-xl bg-zinc-800/60 p-1 mb-8">
        <button
          onClick={() => setTab('new')}
          className={cn(
            'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
            tab === 'new'
              ? 'bg-zinc-700 text-zinc-100 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          New here
        </button>
        <button
          onClick={() => setTab('returning')}
          className={cn(
            'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
            tab === 'returning'
              ? 'bg-zinc-700 text-zinc-100 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          I have a key
        </button>
      </div>

      {tab === 'new' ? (
        <NewUserForm onComplete={onComplete} />
      ) : (
        <ReturningUserForm onComplete={onComplete} />
      )}
    </div>
  );
}

// ─── New User ────────────────────────────────────────────────────────────────

function NewUserForm({ onComplete }: { onComplete: () => void }) {
  const { nsec: loginWithNsec } = useLoginActions();
  const { mutateAsync: publish } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [generatedNsec, setGeneratedNsec] = useState<string | null>(null);
  const [showNsec, setShowNsec] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedKey, setSavedKey] = useState(false);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'name' | 'backup'>('name');

  const handleGenerateKey = () => {
    if (!name.trim()) return;
    const sk = generateSecretKey();
    const nsec = nip19.nsecEncode(sk);
    setGeneratedNsec(nsec);
    setStep('backup');
    // Log in immediately so uploads work
    loginWithNsec(nsec);
  };

  const handleCopyNsec = async () => {
    if (!generatedNsec) return;
    await navigator.clipboard.writeText(generatedNsec);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const tags = await uploadFile(file);
      const url = tags[0]?.[1];
      if (url) setPfpUrl(url);
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinish = async () => {
    if (!savedKey) {
      toast({ title: 'Please confirm you saved your key', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Publish kind 0 profile
      const metadata: Record<string, string> = { name: name.trim() };
      if (pfpUrl) metadata.picture = pfpUrl;
      await publish({
        kind: 0,
        content: JSON.stringify(metadata),
        tags: [],
      });
      onComplete();
    } catch {
      // Profile publish may fail if relay isn't connected yet — that's ok,
      // the relay step comes next. Just proceed.
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'name') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-zinc-300 text-sm">Your name</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && handleGenerateKey()}
            placeholder="e.g. Sarah, Bob, The Bread Lady…"
            className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50 h-12 text-base"
            autoFocus
          />
          <p className="text-xs text-zinc-500">
            Just a name your group will recognise. No email, no account — just a name and a key.
          </p>
        </div>
        <Button
          onClick={handleGenerateKey}
          disabled={!name.trim()}
          className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold shadow-lg shadow-violet-900/30 disabled:opacity-40"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Create my account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile picture */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-2xl bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
          {pfpUrl ? (
            <>
              <img src={pfpUrl} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setPfpUrl(null)}
                className="absolute top-1 right-1 w-5 h-5 bg-zinc-900/80 rounded-full flex items-center justify-center text-zinc-300 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <span className="text-3xl font-bold text-zinc-600">
              {name.trim()[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <p className="font-semibold text-zinc-100">{name}</p>
          <label className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 cursor-pointer transition-colors">
            {isUploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
            ) : (
              <><ImagePlus className="w-3.5 h-3.5" /> {pfpUrl ? 'Change photo' : 'Add a photo (optional)'}</>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePfpUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Key backup */}
      <div className="rounded-xl bg-amber-950/40 border border-amber-800/50 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <KeyRound className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">Save your secret key</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              This is your password. Lose it and you lose access to your listings. There's no recovery.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className={cn(
            'font-mono text-xs break-all rounded-lg bg-zinc-900/60 border border-zinc-700 px-3 py-2.5 pr-20 text-zinc-300 select-all',
            !showNsec && 'blur-sm select-none'
          )}>
            {generatedNsec}
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button
              onClick={() => setShowNsec(v => !v)}
              className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {showNsec ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCopyNsec}
              className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm saved */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => setSavedKey(v => !v)}
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0',
              savedKey
                ? 'bg-violet-600 border-violet-600'
                : 'border-zinc-600 group-hover:border-zinc-400'
            )}
          >
            {savedKey && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
            I've saved my secret key somewhere safe
          </span>
        </label>
      </div>

      <Button
        onClick={handleFinish}
        disabled={!savedKey || isSubmitting}
        className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold shadow-lg shadow-violet-900/30 disabled:opacity-40"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
        Continue →
      </Button>
    </div>
  );
}

// ─── Returning User ───────────────────────────────────────────────────────────

function ReturningUserForm({ onComplete }: { onComplete: () => void }) {
  const { nsec: loginWithNsec } = useLoginActions();
  const { toast } = useToast();
  const [nsec, setNsec] = useState('');
  const [showNsec, setShowNsec] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const trimmed = nsec.trim();
    if (!trimmed.startsWith('nsec1')) {
      toast({ title: 'Invalid key', description: 'Secret key must start with nsec1', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      loginWithNsec(trimmed);
      onComplete();
    } catch {
      toast({ title: 'Invalid key', description: 'Could not parse that secret key.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-zinc-300 text-sm">Your secret key</Label>
        <div className="relative">
          <Input
            value={nsec}
            onChange={e => setNsec(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="nsec1…"
            type={showNsec ? 'text' : 'password'}
            className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50 h-12 font-mono text-sm pr-12"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowNsec(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showNsec ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Starts with <code className="text-zinc-400">nsec1</code>. Never share this with anyone.
        </p>
      </div>

      <Button
        onClick={handleLogin}
        disabled={!nsec.trim() || isLoading}
        className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold shadow-lg shadow-violet-900/30 disabled:opacity-40"
      >
        {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <KeyRound className="w-5 h-5 mr-2" />}
        Sign in
      </Button>
    </div>
  );
}
