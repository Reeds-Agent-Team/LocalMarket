import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Shows a native "Add to Home Screen" banner on supported browsers.
 * On iOS (where the native prompt isn't available), shows a manual tip.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);

    if (isStandalone) return;

    // Check if previously dismissed
    if (localStorage.getItem('zooid:install-dismissed')) return;

    // Android / Chrome: capture the native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari: no native prompt, show manual tip
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setShowIOSTip(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('zooid:install-dismissed', '1');
  };

  if (dismissed || (!deferredPrompt && !showIOSTip)) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
      <div className="rounded-xl bg-zinc-900 border border-violet-500/30 p-4 shadow-2xl shadow-violet-900/20 flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100">Add to Home Screen</p>
          {showIOSTip ? (
            <p className="text-xs text-zinc-400 mt-0.5">
              Tap <span className="text-zinc-200">Share</span> then{' '}
              <span className="text-zinc-200">"Add to Home Screen"</span> for the best experience.
            </p>
          ) : (
            <p className="text-xs text-zinc-400 mt-0.5">
              Install zooidmarket for quick access, even offline.
            </p>
          )}
          {!showIOSTip && (
            <Button
              onClick={handleInstall}
              size="sm"
              className="mt-2 h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white px-3"
            >
              Install
            </Button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
