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
    let timeout: ReturnType<typeof setTimeout>;

    try {
      ws = new WebSocket(relayUrl);

      ws.onopen = () => setStatus('connected');
      ws.onerror = () => setStatus('disconnected');
      ws.onclose = () => setStatus('disconnected');

      // Timeout if no connection in 3s
      timeout = setTimeout(() => {
        if (status === 'connecting') setStatus('disconnected');
        ws?.close();
      }, 3000);
    } catch {
      setStatus('disconnected');
    }

    return () => {
      clearTimeout(timeout);
      ws?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
