import { useState } from 'react';
import { Loader2, ImagePlus, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

interface OnboardingProfileProps {
  onComplete: () => void;
}

export function OnboardingProfile({ onComplete }: OnboardingProfileProps) {
  const { mutateAsync: publish } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [lud16, setLud16] = useState('');
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const metadata: Record<string, string> = { name: name.trim() };
      if (bio.trim()) metadata.about = bio.trim();
      if (lud16.trim()) metadata.lud16 = lud16.trim();
      if (pfpUrl) metadata.picture = pfpUrl;

      await publish({
        kind: 0,
        content: JSON.stringify(metadata),
        tags: [],
      });

      // Invalidate so the rest of the app picks up the new profile immediately
      queryClient.invalidateQueries({ queryKey: ['nostr', 'author'] });

      // Clear the new-user flag — profile step is done
      localStorage.removeItem('localmarket:new-user');

      onComplete();
    } catch (err) {
      console.error('[OnboardingProfile] publish failed:', err);
      toast({ title: 'Could not save profile', description: 'Check your relay connection and try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar + name row */}
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
          <label className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 cursor-pointer transition-colors">
            {isUploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
            ) : (
              <><ImagePlus className="w-3.5 h-3.5" /> {pfpUrl ? 'Change photo' : 'Add a photo (optional)'}</>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePfpUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label className="text-zinc-300 text-sm">
          Your name <span className="text-red-400">*</span>
        </Label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. Sarah, Bob, The Bread Lady…"
          className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50 h-12 text-base"
          autoFocus
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label className="text-zinc-300 text-sm">
          Bio <span className="text-zinc-600 text-xs font-normal">(optional)</span>
        </Label>
        <Textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="A short description about yourself or what you sell…"
          rows={3}
          className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50 resize-none"
        />
      </div>

      {/* Lightning address */}
      <div className="space-y-2">
        <Label className="text-zinc-300 text-sm flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          Lightning address <span className="text-zinc-600 text-xs font-normal">(optional)</span>
        </Label>
        <Input
          value={lud16}
          onChange={e => setLud16(e.target.value)}
          placeholder="you@wallet.com"
          className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50 h-11 font-mono text-sm"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!name.trim() || isSubmitting || isUploading}
        className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold shadow-lg shadow-violet-900/30 disabled:opacity-40"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
        Enter the market →
      </Button>
    </div>
  );
}
