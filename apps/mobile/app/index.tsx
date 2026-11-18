import { Text, View } from "react-native";
import { lightTokens } from "@inbox/ui-core";

/** Placeholder root (Phase 2c scaffold). Replaced by tabs + auth in Phase 3. */
export default function Home() {
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: lightTokens.bg }}>
      <Text style={{ color: lightTokens.text, fontSize: 16 }}>Stash — mobile scaffold</Text>
    </View>
  );
}
