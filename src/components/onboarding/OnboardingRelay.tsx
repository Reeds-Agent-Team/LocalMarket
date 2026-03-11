import { useState, useCallback } from 'react';
import { Camera, WifiOff, CheckCircle, Loader2, QrCode, RefreshCw, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQRScanner } from '@/hooks/useQRScanner';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { deriveBlossomUrl } from '@/lib/deriveBlossomUrl';
import { parseInviteLink, type InviteData } from '@/lib/parseInviteLink';
import { sendJoinRequest } from '@/lib/sendJoinRequest';
import { cn } from '@/lib/utils';

interface OnboardingRelayProps {
  onComplete: () => void;
}

export function OnboardingRelay({ onComplete }: OnboardingRelayProps) {
  const { updateConfig } = useAppContext();
  const { toast } = useToast();
  const { user } = useCurrentUser();

  // Pre-fill from deep-link if the user arrived via /join?r=...&c=...
  const pendingInviteRaw = sessionStorage.getItem('localmarket:pending-invite');
  const pendingInvite = pendingInviteRaw ? (() => { try { return JSON.parse(pendingInviteRaw) as InviteData; } catch { return null; } })() : null;

  const [invite, setInvite] = useState<InviteData | null>(pendingInvite);
  const [isJoining, setIsJoining] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'saving' | 'joining' | 'done'>('idle');

  const handleScan = useCallback((data: string) => {
    const parsed = parseInviteLink(data);
    if (!parsed) {
      toast({
        title: 'Not a valid invite',
        description: "That QR code doesn't contain a relay URL. Try again.",
        variant: 'destructive',
      });
      setTimeout(() => scanner.start(), 1500);
      return;
    }
    setInvite(parsed);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scanner = useQRScanner({ onResult: handleScan });

  const handleConfirm = async () => {
    if (!invite) return;
    setIsJoining(true);
    sessionStorage.removeItem('localmarket:pending-invite');

    const blossomUrl = deriveBlossomUrl(invite.url);

    // 1. Save relay + blossom config first
    setJoinStatus('saving');
    updateConfig(current => ({
      ...current,
      relayMetadata: {
        relays: [{ url: invite.url, read: true, write: true }],
        updatedAt: Math.floor(Date.now() / 1000),
      },
      blossomServer: blossomUrl,
    }));

    // 2. Send join request + publish pending profile via a direct NRelay1
    //    connection (bypasses the pool so we don't depend on reconnect timing)
    if (user) {
      setJoinStatus('joining');

      // Send join request if there's a claim code
      if (invite.claim) {
        try {
          await sendJoinRequest(invite.url, invite.claim, user);
          console.log('[OnboardingRelay] Join request sent successfully');
        } catch (err) {
          console.warn('[OnboardingRelay] Join request failed:', err);
        }
      }
    }

    setJoinStatus('done');
    setIsJoining(false);
    onComplete();
  };

  const handleRetry = () => {
    setInvite(null);
    scanner.start();
  };

  return (
    <div className="w-full space-y-6">
      {/* Scanned / confirmed state */}
      {invite ? (
        <div className="space-y-5">
          <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-300">Invite scanned!</p>
                <p className="text-xs text-zinc-500 mt-0.5">Ready to join the market.</p>
              </div>
            </div>

            <div className="space-y-2 pl-1">
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-zinc-400 w-14 shrink-0 mt-0.5">Relay</span>
                <span className="text-xs font-mono text-emerald-400/90 break-all">{invite.url}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-zinc-400 w-14 shrink-0 mt-0.5">Media</span>
                <span className="text-xs font-mono text-emerald-400/90 break-all">{deriveBlossomUrl(invite.url)}</span>
              </div>
              {invite.claim && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-14 shrink-0">Invite</span>
                  <div className="flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-violet-400" />
                    <span className="text-xs font-mono text-violet-400">{invite.claim}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status indicator during join */}
          {isJoining && (
            <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/40 px-4 py-3 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
              <p className="text-sm text-zinc-400">
                {joinStatus === 'saving' && 'Connecting to relay…'}
                {joinStatus === 'joining' && 'Sending join request…'}
              </p>
            </div>
          )}

          <Button
            onClick={handleConfirm}
            disabled={isJoining}
            className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold shadow-lg shadow-violet-900/30"
          >
            {isJoining ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Joining…</>
            ) : (
              'Join the market →'
            )}
          </Button>

          <button
            onClick={handleRetry}
            className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Scan a different code
          </button>
        </div>
      ) : (
        <>
          {/* Camera viewfinder */}
          <div
            className={cn(
              'relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-zinc-800/80',
              'border-2',
              scanner.status === 'scanning' ? 'border-violet-500/60' : 'border-zinc-700'
            )}
          >
            <video
              ref={scanner.videoRef}
              className={cn(
                'absolute inset-0 w-full h-full object-cover',
                scanner.status !== 'scanning' && 'hidden'
              )}
              muted
              playsInline
            />
            <canvas ref={scanner.canvasRef} className="hidden" />

            {scanner.status !== 'scanning' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                {scanner.status === 'error' ? (
                  <>
                    <WifiOff className="w-10 h-10 text-red-400" />
                    <p className="text-sm text-red-300 font-medium">Camera access denied</p>
                    <p className="text-xs text-zinc-500">{scanner.error}</p>
                    <Button
                      onClick={() => scanner.start()}
                      size="sm"
                      variant="outline"
                      className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 mt-2"
                    >
                      Try again
                    </Button>
                  </>
                ) : scanner.status === 'requesting' ? (
                  <>
                    <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
                    <p className="text-sm text-zinc-400">Accessing camera…</p>
                  </>
                ) : (
                  <>
                    <QrCode className="w-16 h-16 text-zinc-600" />
                    <p className="text-sm text-zinc-400">Camera will appear here</p>
                  </>
                )}
              </div>
            )}

            {scanner.status === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-violet-400 rounded-tl-sm" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-violet-400 rounded-tr-sm" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-violet-400 rounded-bl-sm" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-violet-400 rounded-br-sm" />
                <div className="absolute left-6 right-6 h-0.5 bg-violet-400/70 animate-scan-line" />
              </div>
            )}
          </div>

          {scanner.status === 'idle' && (
            <Button
              onClick={() => scanner.start()}
              className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold shadow-lg shadow-violet-900/30"
            >
              <Camera className="w-5 h-5 mr-2" />
              Open camera &amp; scan
            </Button>
          )}

          {scanner.status === 'scanning' && (
            <p className="text-center text-sm text-zinc-400 animate-pulse">
              Point your camera at the invite QR code…
            </p>
          )}
        </>
      )}
    </div>
  );
}
