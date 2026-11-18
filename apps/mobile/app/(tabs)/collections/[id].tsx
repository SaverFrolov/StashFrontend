import { useLocalSearchParams } from "expo-router";
import { ScreenPlaceholder } from "../../../src/components/ScreenPlaceholder";

/** S8 — replaced by the real collection detail in Phase 5. */
export default function CollectionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ScreenPlaceholder title={`Collection ${id ?? ""}`} note="S8 — Phase 5" />;
}
