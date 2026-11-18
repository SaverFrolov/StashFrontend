import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { CheckCircle2, X, XCircle } from "lucide-react-native";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { GlassSurface } from "./GlassSurface";

export type ToastVariant = "success" | "error" | "undo";

export interface ToastOptions {
  variant: ToastVariant;
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

interface ActiveToast extends ToastOptions {
  id: number;
}

let counter = 0;

/** Toasts: top-centre on mobile (web parity for the mobile placement). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    counter += 1;
    const item: ActiveToast = { ...options, id: counter };
    setToasts((prev) => [...prev.slice(-2), item]);
    const duration = options.durationMs ?? (options.variant === "undo" ? 8000 : 4000);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== item.id));
    }, duration);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);
  const insets = useSafeAreaInsets();

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 8 }]}>
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: ActiveToast; onDismiss: () => void }) {
  const { tokens } = useTheme();
  const progress = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + progress.value * 0.6,
    transform: [{ translateY: (1 - progress.value) * -12 }],
  }));
  useEffect(() => {
    progress.value = withTiming(1, { duration: 150 });
  }, [progress]);

  const Icon = toast.variant === "success" ? CheckCircle2 : XCircle;
  const iconColor =
    toast.variant === "success" ? tokens.success : toast.variant === "error" ? tokens.danger : tokens.textSecondary;

  return (
    <Animated.View style={[styles.rowWrap, animatedStyle]}>
      <GlassSurface style={{ borderRadius: radii.dialog }}>
        <View style={styles.row}>
          <Icon size={18} color={iconColor} strokeWidth={1.5} />
          <Text style={{ flex: 1, color: tokens.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
            {toast.message}
          </Text>
          {toast.variant === "undo" && toast.onUndo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toast.undoLabel ?? "Undo"}
              onPress={() => {
                toast.onUndo?.();
                onDismiss();
              }}
              hitSlop={6}
              style={({ pressed }) => [
                styles.undoBtn,
                { borderColor: tokens.borderStrong, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={{ color: tokens.accent, fontFamily: fonts.medium, fontSize: 13 }}>
                {toast.undoLabel ?? "Undo"}
              </Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onDismiss} hitSlop={6}>
            <X size={14} color={tokens.textTertiary} strokeWidth={1.5} />
          </Pressable>
        </View>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    gap: 8,
    zIndex: 100,
  },
  rowWrap: { maxWidth: 420, width: "100%" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  undoBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.control,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

/** Shared ref type helper for screens that keep a toast timeout. */
export type ToastTimerRef = ReturnType<typeof useRef<number | undefined>>;
