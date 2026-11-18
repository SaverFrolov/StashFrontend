import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { APP_NAME } from "@inbox/api-client";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { GlassSurface } from "./GlassSurface";

/** Shared centered glass card layout for S1–S3 (web AuthLayout parity, max 400dp). */
export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.cardWrap}>
          <Text
            style={{
              color: tokens.text,
              fontFamily: fonts.semibold,
              fontSize: 22,
              lineHeight: 28,
              textAlign: "center",
            }}
          >
            {APP_NAME}
          </Text>
          <Text
            style={{
              color: tokens.textSecondary,
              fontFamily: fonts.regular,
              fontSize: 14,
              lineHeight: 20,
              textAlign: "center",
              marginTop: 4,
              marginBottom: 20,
            }}
          >
            {title}
          </Text>
          {/* Fallback=true removes Android's expensive blur, keeping simple glass surface like web */}
          <GlassSurface fallback style={{ borderRadius: radii.dialog, padding: 24, gap: 16 }}>
            {children}
          </GlassSurface>
          {footer ? <View style={{ marginTop: 16 }}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },
  cardWrap: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
});
