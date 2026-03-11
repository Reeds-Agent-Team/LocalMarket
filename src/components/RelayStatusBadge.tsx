import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface RelayStatusBadgeProps {
  relayUrl: string;
}

type Status = 'connecting' | 'connected' | 'disconnected';

export function RelayStatusBadge({ relayUrl }: RelayStatusBadgeProps) {
  const [status, setStatus] = useState<Status>('connecting');

  useEffect(() => {
    if (!relayUrl || relayUrl === 'not configured') {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    let ws: WebSocket | null = null;
    let everOpened = false;

    const timeout = setTimeout(() => {
      setStatus('disconnected');
      ws?.close();
    }, 5000);

    try {
      ws = new WebSocket(relayUrl);

      ws.onopen = () => {
        everOpened = true;
        clearTimeout(timeout);
        setStatus('connected');
        // Close the probe connection after confirming it opened
        setTimeout(() => ws?.close(), 500);
      };

      ws.onmessage = (e) => {
        // If we receive ANY message (including AUTH challenge), the relay is reachable
        try {
          const msg = JSON.parse(e.data);
          if (Array.isArray(msg) && msg[0] === 'AUTH') {
            // Private relay — it's up and requiring auth, that's healthy
            everOpened = true;
            clearTimeout(timeout);
            setStatus('connected');
            ws?.close();
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        if (!everOpened) {
          clearTimeout(timeout);
          setStatus('disconnected');
        }
      };

      ws.onclose = () => {
        // Only mark disconnected if we never successfully opened or got an AUTH
        if (!everOpened) {
          clearTimeout(timeout);
          setStatus('disconnected');
        }
      };
    } catch {
      clearTimeout(timeout);
      setStatus('disconnected');
    }

    return () => {
      clearTimeout(timeout);
      ws?.close();
    };
  }, [relayUrl]);

  const configs: Record<Status, { label: string; icon: React.ReactNode; className: string }> = {
    connecting: {
      label: relayUrl,
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    },
    connected: {
      label: relayUrl,
      icon: <Wifi className="w-3 h-3" />,
      className: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    },
    disconnected: {
      label: relayUrl === 'not configured' ? 'No relay configured' : relayUrl,
      icon: <WifiOff className="w-3 h-3" />,
      className: 'bg-red-950/60 text-red-400 border-red-800/60',
    },
  };

  const cfg = configs[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
