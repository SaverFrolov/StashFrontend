import { Redirect } from "expo-router";
import { useAuth } from "../src/state/AuthContext";

/** Entry gate: waits for session restore, then routes to tabs or login. */
export default function Index() {
  const { session, ready } = useAuth();
  if (!ready) return null;
  return <Redirect href={session ? "/(tabs)" : "/(auth)/login"} />;
}
