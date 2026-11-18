import { forwardRef } from "react";
import type { ReactNode, Ref } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";

export { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export interface SheetProps {
  title?: string;
  snapPoints?: Array<string | number>;
  children: ReactNode;
}

/**
 * Glass bottom sheet for M2/M4/M5/M7/M8/M9/M12 (web dialogs that were
 * bottom sheets on mobile). Present the sheet via ref: sheetRef.current?.present()
 */
export const Sheet = forwardRef(function Sheet(
  { title, snapPoints = ["50%", "85%"], children }: SheetProps,
  ref: Ref<BottomSheetModal>,
) {
  const { tokens } = useTheme();
  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: tokens.surface, borderRadius: radii.dialog }}
      handleIndicatorStyle={{ backgroundColor: tokens.borderStrong }}
    >
      <BottomSheetView style={styles.body}>
        {title ? (
          <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26 }}>
            {title}
          </Text>
        ) : null}
        <View style={styles.content}>{children}</View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  content: {
    flex: 1,
  },
});
