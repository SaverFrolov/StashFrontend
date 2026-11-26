import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@inbox/ui";
import { SettingsProvider } from "./state/settings";
import { AuthProvider } from "./state/auth";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { LoginScreen } from "./screens/LoginScreen";
import { SignupScreen } from "./screens/SignupScreen";
import { ResetPasswordScreen } from "./screens/ResetPasswordScreen";
import { InboxScreen } from "./screens/InboxScreen";
import { ItemDetailScreen } from "./screens/ItemDetailScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { AskScreen } from "./screens/AskScreen";
import { CollectionsScreen, CollectionDetailScreen } from "./screens/CollectionsScreen";
import { TagsScreen } from "./screens/TagsScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { CaptureScreen } from "./screens/CaptureScreen";
import { NotFoundScreen } from "./screens/NotFoundScreen";
import { OfflineScreen } from "./screens/OfflineScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CommandPaletteProvider } from "./components/CommandPalette";
import { ModalProvider } from "./modals/ModalProvider";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AuthProvider>
            <ToastProvider>
              <BrowserRouter>
                {/* Modal/palette providers use router hooks — they must be inside Router */}
                <ModalProvider>
                  <CommandPaletteProvider>
                    <Suspense fallback={null}>
                      <Routes>
                        <Route path="/login" element={<LoginScreen />} />
                        <Route path="/signup" element={<SignupScreen />} />
                        <Route path="/reset-password" element={<ResetPasswordScreen />} />
                        <Route path="/offline" element={<OfflineScreen />} />
                        <Route element={<RequireAuth />}>
                          <Route element={<AppShell />}>
                            <Route path="/" element={<Navigate to="/inbox" replace />} />
                            <Route path="/inbox" element={<InboxScreen />} />
                            <Route path="/items/:id" element={<ItemDetailScreen />} />
                            <Route path="/search" element={<SearchScreen />} />
                            <Route path="/ask" element={<AskScreen />} />
                            <Route path="/collections" element={<CollectionsScreen />} />
                            <Route path="/collections/:id" element={<CollectionDetailScreen />} />
                            <Route path="/tags" element={<TagsScreen />} />
                            <Route path="/admin" element={<AdminScreen />} />
                            <Route path="/settings/*" element={<SettingsScreen />} />
                            <Route path="*" element={<NotFoundScreen />} />
                          </Route>
                          <Route path="/capture" element={<CaptureScreen />} />
                        </Route>
                      </Routes>
                    </Suspense>
                  </CommandPaletteProvider>
                </ModalProvider>
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
