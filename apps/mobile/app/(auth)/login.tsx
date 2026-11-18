import { useState } from "react";
import { Pressable, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AuthCard } from "../../src/components/AuthCard";
import { Button } from "../../src/components/Button";
import { Field, Input } from "../../src/components/Field";
import { useAuth } from "../../src/state/AuthContext";
import { fonts, useTheme } from "../../src/theme/ThemeProvider";

/** S1 /login — MockApi accepts any credentials (demo). */
export default function LoginScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch {
      setError(t("auth.invalidCredentials"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.loginTitle")}
      footer={
        <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 13, textAlign: "center" }}>
          {t("auth.noAccount")}{" "}
          <Link href="/(auth)/signup" asChild>
            <Pressable hitSlop={6}>
              <Text style={{ color: tokens.accent, fontFamily: fonts.medium, fontSize: 13 }}>
                {t("common.signUp")}
              </Text>
            </Pressable>
          </Link>
        </Text>
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
          returnKeyType="next"
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
      <Button
        variant="primary"
        label={t("common.signIn")}
        loading={busy}
        disabled={!email.trim() || !password}
        onPress={() => void submit()}
        fullWidth
      />
      <Link href="/(auth)/reset-password" asChild>
        <Pressable hitSlop={8} style={{ alignSelf: "center" }}>
          <Text style={{ color: tokens.accent, fontFamily: fonts.regular, fontSize: 13 }}>
            {t("auth.forgotPassword")}
          </Text>
        </Pressable>
      </Link>
    </AuthCard>
  );
}
