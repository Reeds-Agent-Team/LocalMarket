import { useState, useCallback } from 'react';
import { Camera, WifiOff, CheckCircle, Loader2, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQRScanner } from '@/hooks/useQRScanner';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface OnboardingRelayProps {
  onComplete: () => void;
}

/** Extracts a WebSocket relay URL from QR code data.
 *  Accepts:
 *   - Raw:  wss://relay.example.com
 *   - URI:  nostr+relay://relay.example.com
 *   - URL:  https://relay.example.com  (converted to wss)
 */
function extractRelayUrl(data: string): string | null {
  const trimmed = data.trim();

  // Direct wss:// or ws://
  if (trimmed.startsWith('wss://') || trimmed.startsWith('ws://')) {
    return trimmed;
  }

  // nostr+relay:// scheme
  if (trimmed.startsWith('nostr+relay://')) {
    return 'wss://' + trimmed.slice('nostr+relay://'.length);
  }

  // HTTPS URL → convert to WSS
  if (trimmed.startsWith('https://')) {
    return 'wss://' + trimmed.slice('https://'.length);
  }

  // HTTP URL → convert to WS (unusual but handle it)
  if (trimmed.startsWith('http://')) {
    return 'ws://' + trimmed.slice('http://'.length);
  }

  return null;
}

export function OnboardingRelay({ onComplete }: OnboardingRelayProps) {
  const { updateConfig } = useAppContext();
  const { toast } = useToast();
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleScan = useCallback((data: string) => {
    const url = extractRelayUrl(data);
    if (!url) {
      toast({
        title: 'Not a relay QR code',
        description: 'That QR code doesn\'t contain a relay URL. Try again.',
        variant: 'destructive',
      });
      // Restart scanner after a short pause
      setTimeout(() => scanner.start(), 1500);
      return;
    }
    setScannedUrl(url);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scanner = useQRScanner({ onResult: handleScan });

  const handleConfirm = async () => {
    if (!scannedUrl) return;
    setIsConnecting(true);

    // Quick connectivity check
    let connected = false;
    try {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(scannedUrl);
        const timeout = setTimeout(() => { ws.close(); reject(new Error('timeout')); }, 4000);
        ws.onopen = () => { clearTimeout(timeout); ws.close(); connected = true; resolve(); };
        ws.onerror = () => { clearTimeout(timeout); reject(new Error('connection failed')); };
      });
    } catch {
      // Proceed anyway — relay might need auth or be temporarily busy
    }

    updateConfig(current => ({
      ...current,
      relayMetadata: {
        relays: [{ url: scannedUrl, read: true, write: true }],
        updatedAt: Math.floor(Date.now() / 1000),
      },
    }));

    setIsConnecting(false);
    onComplete();
  };

  const handleRetry = () => {
    setScannedUrl(null);
    scanner.start();
  };

  return (
    <div className="w-full space-y-6">
      {/* Scanned result state */}
      {scannedUrl ? (
        <div className="space-y-5">
          <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/50 p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-300">QR code scanned!</p>
              <p className="text-xs text-emerald-400/80 mt-0.5 break-all font-mono">{scannedUrl}</p>
            </div>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={isConnecting}
            className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold shadow-lg shadow-violet-900/30"
          >
            {isConnecting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Connecting…</>
            ) : (
              'Connect to market →'
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
            {/* Video element — always in DOM so ref is stable */}
            <video
              ref={scanner.videoRef}
              className={cn(
                'absolute inset-0 w-full h-full object-cover',
                scanner.status !== 'scanning' && 'hidden'
              )}
              muted
              playsInline
            />
            {/* Hidden canvas for frame analysis */}
            <canvas ref={scanner.canvasRef} className="hidden" />

            {/* Idle / error state overlay */}
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

            {/* Scanning corner frame overlay */}
            {scanner.status === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner marks */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-violet-400 rounded-tl-sm" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-violet-400 rounded-tr-sm" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-violet-400 rounded-bl-sm" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-violet-400 rounded-br-sm" />
                {/* Scan line animation */}
                <div className="absolute left-6 right-6 h-0.5 bg-violet-400/70 animate-scan-line" />
              </div>
            )}
          </div>

          {/* Start scan button */}
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
              Point your camera at the relay QR code…
            </p>
          )}
        </>
      )}
    </div>
  );
}
