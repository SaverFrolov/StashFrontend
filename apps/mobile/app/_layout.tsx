import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { AuthProvider } from "../src/state/AuthContext";
import { ToastProvider } from "../src/components/Toast";
import { BottomSheetModalProvider } from "../src/components/Sheet";
import { OfflineBanner } from "../src/components/OfflineBanner";
import { SessionExpiredDialog } from "../src/components/SessionExpiredDialog";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { initI18n } from "../src/i18n";

initI18n();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function ThemedShell() {
  return (
    <>
      <ToastProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#000000" },
            animation: "fade",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="items/[id]" />
          <Stack.Screen
            name="capture"
            options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        <OfflineBanner />
        <SessionExpiredDialog />
      </ToastProvider>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ErrorBoundary>
            <ThemeProvider>
              <AuthProvider>
                <QueryClientProvider client={queryClient}>
                  <BottomSheetModalProvider>
                    <ThemedShell />
                  </BottomSheetModalProvider>
                </QueryClientProvider>
              </AuthProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
