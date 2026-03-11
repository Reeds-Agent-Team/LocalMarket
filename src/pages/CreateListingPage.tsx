import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';

import { X, PlusCircle, Loader2, ArrowLeft, ImagePlus, Camera } from 'lucide-react';
import { AuthenticatedImage } from '@/components/AuthenticatedImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';
import { Link } from 'react-router-dom';
import { LoginArea } from '@/components/auth/LoginArea';

const CATEGORIES = ['electronics', 'clothing', 'tools', 'food', 'books', 'services', 'other'];
const CURRENCIES = ['sats', 'BTC', 'USD', 'EUR', 'GBP'];

export function CreateListingPage() {
  useSeoMeta({ title: 'Create Listing — localmarket' });

  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending: isPublishing } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('sats');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('other');
  const [images, setImages] = useState<string[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const tags = await uploadFile(file);
      const url = tags[0]?.[1];
      if (url) {
        setImages(prev => [...prev, url]);
        toast({ title: 'Image uploaded!' });
      }
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload image.', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }

    const d = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const tags: string[][] = [
      ['d', d],
      ['title', title.trim()],
      ['published_at', String(now)],
      ['status', 'active'],
      ['t', category],
    ];

    if (summary.trim()) tags.push(['summary', summary.trim()]);
    if (location.trim()) tags.push(['location', location.trim()]);
    if (price.trim()) tags.push(['price', price.trim(), currency]);
    for (const img of images) {
      tags.push(['image', img]);
    }

    try {
      await publish({
        kind: 30402,
        content: description,
        tags,
      });

      const naddr = nip19.naddrEncode({
        kind: 30402,
        pubkey: user.pubkey,
        identifier: d,
      });

      toast({ title: 'Listing published!', description: 'Your item is now live.' });
      navigate(`/listing/${naddr}`);
    } catch {
      toast({ title: 'Failed to publish', description: 'Check your relay connection.', variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-zinc-200 mb-4">Sign in to list an item</h2>
          <p className="text-zinc-400 text-sm mb-8">You need a Nostr account to create listings.</p>
          <LoginArea className="max-w-xs mx-auto" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to market
        </Link>

        <Card className="bg-zinc-900/80 border-zinc-800/60">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-xl">List an Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Title <span className="text-red-400">*</span></Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="What are you selling?"
                  className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50"
                  required
                />
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Short Summary</Label>
                <Input
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="One-line tagline"
                  className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-zinc-100 focus:ring-violet-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="text-zinc-200 capitalize focus:bg-zinc-800">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Price</Label>
                <div className="flex gap-2">
                  <Input
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="Amount"
                    type="number"
                    min="0"
                    step="any"
                    className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50 flex-1"
                  />
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-zinc-100 focus:ring-violet-500/50 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {CURRENCIES.map(c => (
                        <SelectItem key={c} value={c} className="text-zinc-200 focus:bg-zinc-800">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Location</Label>
                <Input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="City, region, or 'Remote'"
                  className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Description</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detailed description of the item, condition, terms, etc. Markdown supported."
                  rows={6}
                  className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500/50 resize-none"
                />
              </div>

              {/* Images */}
              <div className="space-y-3">
                <Label className="text-zinc-300">Images</Label>
                <div className="flex flex-wrap gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 group">
                      <AuthenticatedImage src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Take photo (camera) */}
                  <label className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-700 hover:border-violet-500/50 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                        <span className="text-xs text-zinc-600 mt-1">Camera</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>

                  {/* Choose from library */}
                  <label className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-700 hover:border-violet-500/50 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                        <span className="text-xs text-zinc-600 mt-1">Library</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isPublishing || !title.trim()}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Publish Listing
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
