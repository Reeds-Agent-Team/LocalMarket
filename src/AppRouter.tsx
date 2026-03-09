import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import { ListingPage } from "./pages/ListingPage";
import { CreateListingPage } from "./pages/CreateListingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { MessagesPage } from "./pages/MessagesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/listing/new" element={<CreateListingPage />} />
        <Route path="/listing/:naddr" element={<ListingPage />} />
        <Route path="/profile/:npub" element={<ProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:npub" element={<MessagesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
