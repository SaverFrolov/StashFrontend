import { StyleSheet, Text, View } from "react-native";
import { fonts, useTheme } from "../theme/ThemeProvider";

/** Temporary phase placeholder for screens implemented in later phases. */
export function ScreenPlaceholder({ title, note }: { title: string; note: string }) {
  const { tokens } = useTheme();
  return (
    <View style={styles.center}>
      <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26 }}>{title}</Text>
      <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 24,
  },
});
