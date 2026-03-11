import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Save, Loader2, Wifi, PlusCircle, Trash2, Settings, LogOut, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Layout } from '@/components/Layout';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { EditProfileForm } from '@/components/EditProfileForm';
import { RelayStatusBadge } from '@/components/RelayStatusBadge';
import { deriveBlossomUrl } from '@/lib/deriveBlossomUrl';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginActions } from '@/hooks/useLoginActions';
import { LoginArea } from '@/components/auth/LoginArea';

interface RelayEntry {
  url: string;
  read: boolean;
  write: boolean;
}

export function SettingsPage() {
  useSeoMeta({ title: 'Settings — localmarket' });

  const { config, updateConfig } = useAppContext();
  const { user } = useCurrentUser();
  const { logout } = useLoginActions();
  const { toast } = useToast();

  const [relays, setRelays] = useState<RelayEntry[]>(config.relayMetadata.relays);
  const [newUrl, setNewUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addRelay = () => {
    const url = newUrl.trim();
    if (!url) return;
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      toast({ title: 'Invalid relay URL', description: 'Must start with ws:// or wss://', variant: 'destructive' });
      return;
    }
    if (relays.find(r => r.url === url)) {
      toast({ title: 'Already added', variant: 'destructive' });
      return;
    }
    setRelays(prev => [...prev, { url, read: true, write: true }]);
    setNewUrl('');
  };

  const removeRelay = (url: string) => {
    setRelays(prev => prev.filter(r => r.url !== url));
  };

  const toggleRelay = (url: string, field: 'read' | 'write') => {
    setRelays(prev => prev.map(r => r.url === url ? { ...r, [field]: !r[field] } : r));
  };

  const saveRelays = async () => {
    setIsSaving(true);
    try {
      // Derive Blossom URL from the first write relay
      const firstWriteRelay = relays.find(r => r.write);
      const blossomServer = firstWriteRelay ? deriveBlossomUrl(firstWriteRelay.url) : null;

      updateConfig(current => ({
        ...current,
        relayMetadata: {
          relays,
          updatedAt: Math.floor(Date.now() / 1000),
        },
        blossomServer,
      }));
      toast({ title: 'Settings saved!' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-violet-400" />
            Settings
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Configure your local relay and profile.</p>
        </div>

        {/* Relay settings */}
        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-lg flex items-center gap-2">
              <Wifi className="w-5 h-5 text-violet-400" />
              Relay Configuration
            </CardTitle>
            <CardDescription className="text-zinc-400">
              This is a private marketplace. Connect to your local zooid relay only — no public relays.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {relays.map((relay) => (
              <div key={relay.url} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RelayStatusBadge relayUrl={relay.url} />
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id={`read-${relay.url}`}
                      checked={relay.read}
                      onCheckedChange={() => toggleRelay(relay.url, 'read')}
                      className="data-[state=checked]:bg-violet-600"
                    />
                    <Label htmlFor={`read-${relay.url}`} className="text-xs text-zinc-400 cursor-pointer">Read</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id={`write-${relay.url}`}
                      checked={relay.write}
                      onCheckedChange={() => toggleRelay(relay.url, 'write')}
                      className="data-[state=checked]:bg-violet-600"
                    />
                    <Label htmlFor={`write-${relay.url}`} className="text-xs text-zinc-400 cursor-pointer">Write</Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRelay(relay.url)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {relays.length === 0 && (
              <p className="text-center text-sm text-zinc-500 py-4 rounded-lg border border-dashed border-zinc-700">
                No relays configured. Add your local zooid relay below.
              </p>
            )}

            {/* Add relay */}
            <div className="flex gap-2 pt-2">
              <Input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRelay()}
                placeholder="ws://localhost:7777"
                className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50 font-mono text-sm"
              />
              <Button
                onClick={addRelay}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 shrink-0"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Add
              </Button>
            </div>

            <Button
              onClick={saveRelays}
              disabled={isSaving}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Relay Settings
            </Button>

            {/* Derived Blossom server display */}
            {config.blossomServer && (
              <div className="rounded-lg bg-zinc-800/30 border border-zinc-700/40 p-3 flex items-start gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-zinc-400">Media server</p>
                  <p className="text-xs font-mono text-zinc-500 break-all">{config.blossomServer}</p>
                  <p className="text-xs text-zinc-600">Derived from your relay. All images stay on your server.</p>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-zinc-800/30 border border-zinc-700/40 p-3 text-xs text-zinc-500 space-y-1">
              <p className="font-medium text-zinc-400">Privacy note</p>
              <p>Only configure relays you control. Connect by scanning the market QR code — no public relays, no leaks.</p>
            </div>
          </CardContent>
        </Card>

        {/* Profile settings */}
        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-lg">Profile</CardTitle>
            <CardDescription className="text-zinc-400">
              Update your display name, avatar, and bio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <EditProfileForm />
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-zinc-400 mb-4">Sign in to edit your profile.</p>
                <LoginArea className="max-w-xs mx-auto" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="bg-zinc-900/80 border-red-900/30">
          <CardHeader>
            <CardTitle className="text-zinc-300 text-base">Leave this market</CardTitle>
            <CardDescription className="text-zinc-500">
              Signs you out and clears your relay connection. You'll need to scan a new QR code to re-join.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
              onClick={() => {
                updateConfig(current => ({
                  ...current,
                  relayMetadata: { relays: [], updatedAt: 0 },
                  blossomServer: null,
                }));
                setRelays([]);
                logout();
                toast({ title: 'Signed out — scan a QR code to rejoin' });
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave market &amp; sign out
            </Button>
          </CardContent>
        </Card>

        <div className="text-center pt-4">
          <p className="text-xs text-zinc-600">
            <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">
              Vibed with Shakespeare
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
