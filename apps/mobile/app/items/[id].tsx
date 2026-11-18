import { Redirect, useLocalSearchParams } from "expo-router";
import { ScreenPlaceholder } from "../../src/components/ScreenPlaceholder";
import { useAuth } from "../../src/state/AuthContext";

/** S5 — replaced by the real item detail in Phase 5. */
export default function ItemDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, ready } = useAuth();
  if (!ready) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <ScreenPlaceholder title={`Item ${id ?? ""}`} note="S5 — Phase 5" />;
}
