import { useState } from "react";
import { Pressable, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AuthCard } from "../../src/components/AuthCard";
import { Button } from "../../src/components/Button";
import { Field, Input } from "../../src/components/Field";
import { useAuth } from "../../src/state/AuthContext";
import { fonts, useTheme } from "../../src/theme/ThemeProvider";

type FieldName = "name" | "email" | "password";

/** S2 /signup. */
export default function SignupScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ field?: FieldName; message: string } | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError({ field: "name", message: t("auth.nameRequired") });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError({ field: "email", message: t("auth.emailInvalid") });
      return;
    }
    if (password.length < 8) {
      setError({ field: "password", message: t("auth.passwordMin") });
      return;
    }
    setBusy(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace("/(tabs)");
    } catch {
      setError({ message: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t("auth.signupTitle")}
      footer={
        <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 13, textAlign: "center" }}>
          {t("auth.haveAccount")}{" "}
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={6}>
              <Text style={{ color: tokens.accent, fontFamily: fonts.medium, fontSize: 13 }}>
                {t("common.signIn")}
              </Text>
            </Pressable>
          </Link>
        </Text>
      }
    >
      <Field label={t("auth.name")} error={error?.field === "name" ? error.message : undefined}>
        <Input value={name} onChangeText={setName} autoComplete="name" textContentType="name" returnKeyType="next" />
      </Field>
      <Field label={t("auth.email")} error={error?.field === "email" ? error.message : undefined}>
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
      <Field
        label={t("auth.password")}
        hint={t("auth.passwordMin")}
        error={error?.field === "password" ? error.message : error?.field === undefined ? error?.message : undefined}
      >
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </Field>
      <Button variant="primary" label={t("common.signUp")} loading={busy} onPress={() => void submit()} fullWidth />
    </AuthCard>
  );
}
