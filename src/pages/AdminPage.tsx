import { useState, useEffect, useRef } from 'react';
import { useSeoMeta } from '@unhead/react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';
import { ArrowLeft, QrCode, RefreshCw, Copy, Check, Download, Loader2, ShieldAlert, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Layout } from '@/components/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostr } from '@nostrify/react';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { LoginArea } from '@/components/auth/LoginArea';

// kind 28935 = RELAY_INVITE — zooid generates this for us
const RELAY_INVITE_KIND = 28935;

interface InviteEvent {
  claim: string;
  inviteUrl: string;
}

function buildInviteUrl(relayUrl: string, claim: string): string {
  // Flotilla-compatible format: https://host/join?r=wss://relay&c=CLAIM
  // We use the app's own URL as the base so the QR deep-links to localmarket
  const base = window.location.origin + '/join';
  const params = new URLSearchParams({ r: relayUrl, c: claim });
  return `${base}?${params.toString()}`;
}

export function AdminPage() {
  useSeoMeta({ title: 'Admin — localmarket' });

  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { config } = useAppContext();
  const { toast } = useToast();

  const [invite, setInvite] = useState<InviteEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const relayUrl = config.relayMetadata.relays[0]?.url;

  const fetchInvite = async () => {
    if (!user || !relayUrl) return;
    setIsLoading(true);
    setInvite(null);
    setQrDataUrl(null);

    try {
      // Request a kind 28935 invite event from the relay.
      // Zooid generates one per pubkey (or reuses the existing one).
      const events = await nostr.query(
        [{ kinds: [RELAY_INVITE_KIND], authors: [relayUrl], limit: 1 }],
        { signal: AbortSignal.timeout(8000) }
      );

      // Zooid generates the invite event signed by the relay's own key.
      // The claim tag contains the invite code.
      const event = events[0];
      if (event) {
        const claimTag = event.tags.find(([n]) => n === 'claim');
        const claim = claimTag?.[1];
        if (claim) {
          const inviteUrl = buildInviteUrl(relayUrl, claim);
          setInvite({ claim, inviteUrl });
          await generateQR(inviteUrl);
          return;
        }
      }

      toast({
        title: 'No invite found',
        description: 'The relay has not generated an invite yet. Make sure can_invite is enabled in your zooid config.',
        variant: 'destructive',
      });
    } catch (err) {
      console.error('Failed to fetch invite:', err);
      toast({
        title: 'Failed to fetch invite',
        description: 'Could not connect to relay. Check your connection.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateQR = async (url: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#18181b', // zinc-900
        },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  };

  const handleCopyLink = async () => {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'localmarket-invite.png';
    a.click();
  };

  if (!user) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <ShieldAlert className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-200 mb-3">Admin access</h2>
          <p className="text-zinc-400 text-sm mb-8">Sign in with your admin key to manage invites.</p>
          <LoginArea className="max-w-xs mx-auto" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to market
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-violet-400" />
            Admin
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Generate invite QR codes for new members.
          </p>
        </div>

        {/* Invite generator */}
        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-400" />
              Invite a Member
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Generate an invite QR code. Share it in person — scanning it lets someone join this market.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!relayUrl ? (
              <p className="text-sm text-amber-400">No relay configured. Go to Settings first.</p>
            ) : (
              <>
                <Button
                  onClick={fetchInvite}
                  disabled={isLoading}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching invite…</>
                  ) : invite ? (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Generate new invite</>
                  ) : (
                    <><QrCode className="w-4 h-4 mr-2" /> Generate invite QR</>
                  )}
                </Button>

                {/* QR display */}
                {qrDataUrl && invite && (
                  <div className="space-y-4">
                    <Separator className="bg-zinc-800" />

                    {/* QR code */}
                    <div className="flex justify-center">
                      <div className="rounded-xl overflow-hidden border-2 border-zinc-700 shadow-xl">
                        <img
                          src={qrDataUrl}
                          alt="Invite QR code"
                          className="w-64 h-64 block"
                        />
                      </div>
                    </div>

                    {/* Claim code */}
                    <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-4 py-3 text-center">
                      <p className="text-xs text-zinc-500 mb-1">Invite code</p>
                      <p className="font-mono text-lg font-bold text-violet-400 tracking-widest">
                        {invite.claim}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCopyLink}
                        variant="outline"
                        className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        {copied ? (
                          <><Check className="w-4 h-4 mr-2 text-emerald-400" /> Copied!</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-2" /> Copy link</>
                        )}
                      </Button>
                      <Button
                        onClick={handleDownload}
                        variant="outline"
                        className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>

                    <div className="rounded-lg bg-zinc-800/30 border border-zinc-700/40 p-3 text-xs text-zinc-500 space-y-1">
                      <p className="font-medium text-zinc-400">How to use</p>
                      <p>Show this QR code to someone you want to invite. They scan it with localmarket during onboarding. The invite code grants them access to this market.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
