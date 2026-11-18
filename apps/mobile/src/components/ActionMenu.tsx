import { useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { GlassSurface } from "./GlassSurface";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

interface Anchor {
  top: number;
  left: number;
}

const MENU_WIDTH = 208;

/**
 * Anchored dropdown menu ("⋯" on cards, overflow menus). Position is measured
 * from the trigger ON OPEN and then fixed — the menu can never "fly away"
 * (that was a web bug when the anchor unmounted).
 */
export function ActionMenu({
  trigger,
  items,
}: {
  trigger: (open: () => void) => ReactNode;
  items: ActionMenuItem[];
}) {
  const { tokens } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const triggerRef = useRef<ComponentRef<typeof View> | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const open = () => {
    triggerRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      const left = Math.max(8, Math.min(x + width - MENU_WIDTH, screenW - MENU_WIDTH - 8));
      setAnchor({ top: y + height + 6, left });
    });
  };

  const close = () => setAnchor(null);

  return (
    <View ref={triggerRef} collapsable={false}>
      {trigger(open)}
      <Modal visible={anchor !== null} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0, 0, 0, 0.2)" }]}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />
          {anchor ? (
            <GlassSurface
              style={[
                styles.menu,
                { top: anchor.top, left: anchor.left, width: MENU_WIDTH, borderRadius: radii.dialog },
              ]}
            >
              {items.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="menuitem"
                  onPress={() => {
                    close();
                    item.onSelect();
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    { borderRadius: radii.control },
                    pressed && { backgroundColor: tokens.surfaceSubtle },
                  ]}
                >
                  {item.icon}
                  <Text
                    numberOfLines={1}
                    style={{
                      color: item.danger ? tokens.danger : tokens.text,
                      fontFamily: fonts.regular,
                      fontSize: 15,
                      lineHeight: 22,
                      flex: 1,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </GlassSurface>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    padding: 4,
    gap: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
});
