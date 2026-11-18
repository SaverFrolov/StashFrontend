import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { Field, Input } from "./Field";
import { useAuth } from "../state/AuthContext";

/**
 * M13 — session expired: sign in again without losing drafts (drafts live in
 * MMKV and survive re-authentication).
 */
export function SessionExpiredDialog() {
  const { t } = useTranslation();
  const { sessionExpired, clearSessionExpired, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await signIn(email.trim(), password);
      clearSessionExpired();
      setPassword("");
    } catch {
      setError(t("auth.invalidCredentials"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      visible={sessionExpired}
      title={t("modals.sessionExpiredTitle")}
      description={t("modals.sessionExpiredBody")}
      onClose={clearSessionExpired}
      footer={
        <View style={styles.footer}>
          <Button variant="primary" label={t("common.signIn")} loading={busy} onPress={() => void submit()} />
        </View>
      }
    >
      <Field label={t("auth.email")} error={error}>
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
        />
      </Field>
      <Field label={t("auth.password")}>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </Field>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
