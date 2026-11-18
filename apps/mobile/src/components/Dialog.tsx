import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { GlassSurface } from "./GlassSurface";

export interface DialogProps {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  dismissOnBackdrop?: boolean;
}

/** Centred glass dialog (M6 confirm, M13 session expired, M9 reprocess). */
export function Dialog({
  visible,
  title,
  description,
  onClose,
  children,
  footer,
  dismissOnBackdrop = true,
}: DialogProps) {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.center}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0, 0, 0, 0.3)" }]}
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessibilityLabel={title}
          accessibilityRole="button"
        />
        <GlassSurface
          style={[styles.dialog, { borderRadius: radii.dialog, maxWidth: Math.min(520, width - 32) }]}
        >
          <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26 }}>
            {title}
          </Text>
          {description ? (
            <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
              {description}
            </Text>
          ) : null}
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  dialog: {
    width: "100%",
    padding: 24,
    gap: 12,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});
