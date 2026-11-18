import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { MailCheck } from "lucide-react-native";
import { AuthCard } from "../../src/components/AuthCard";
import { Button } from "../../src/components/Button";
import { Field, Input } from "../../src/components/Field";
import { getApiClient } from "../../src/api";
import { fonts, useTheme } from "../../src/theme/ThemeProvider";

/** S3 /reset-password — request state and "check your email" state in one screen. */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const api = getApiClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.requestPasswordReset(email.trim());
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title={t("auth.resetSent")}
        footer={
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={6}>
              <Text style={{ color: tokens.accent, fontFamily: fonts.medium, fontSize: 13 }}>
                {t("common.signIn")}
              </Text>
            </Pressable>
          </Link>
        }
      >
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}>
          <MailCheck size={28} color={tokens.accent} strokeWidth={1.5} />
          <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, textAlign: "center" }}>
            {t("auth.resetSentText")}
          </Text>
        </View>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("auth.resetTitle")}
      footer={
        <Link href="/(auth)/login" asChild>
          <Pressable hitSlop={6}>
            <Text style={{ color: tokens.accent, fontFamily: fonts.medium, fontSize: 13 }}>
              {t("common.signIn")}
            </Text>
          </Pressable>
        </Link>
      }
    >
      <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
        {t("auth.resetText")}
      </Text>
      <Field label={t("auth.email")}>
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </Field>
      <Button
        variant="primary"
        label={t("auth.resetSend")}
        loading={busy}
        disabled={!email.trim()}
        onPress={() => void submit()}
        fullWidth
      />
    </AuthCard>
  );
}
