// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { NostrSync } from '@/components/NostrSync';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { NWCProvider } from '@/contexts/NWCContext';
import { AppConfig } from '@/contexts/AppContext';
import { OnboardingGate } from '@/components/OnboardingGate';
import { InstallPrompt } from '@/components/InstallPrompt';
import AppRouter from './AppRouter';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

// Default config: NO relay pre-configured — onboarding requires QR scan to join
const defaultConfig: AppConfig = {
  theme: "dark",
  relayMetadata: {
    relays: [], // Empty by design — user must scan QR to get a relay
    updatedAt: 0,
  },
};

export function App() {
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="zooid:app-config" defaultConfig={defaultConfig}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='zooid:login'>
            <NostrProvider>
              <NostrSync />
              <NWCProvider>
                <TooltipProvider>
                  <Toaster />
                  <InstallPrompt />
                  <Suspense>
                    <OnboardingGate>
                      <AppRouter />
                    </OnboardingGate>
                  </Suspense>
                </TooltipProvider>
              </NWCProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
