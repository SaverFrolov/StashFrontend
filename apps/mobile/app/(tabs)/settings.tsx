import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AiSettings } from "@inbox/api-client";
import { APP_NAME, features } from "@inbox/api-client";
import { fonts, useTheme } from "../../src/theme/ThemeProvider";
import type { ThemeMode } from "../../src/theme/ThemeProvider";
import { setAppLanguage } from "../../src/i18n";
import { getApiClient } from "../../src/api";
import { useAuth } from "../../src/state/AuthContext";
import { SectionCard } from "../../src/components/SectionCard";
import { Button } from "../../src/components/Button";
import { Field, Input } from "../../src/components/Field";
import { Chip } from "../../src/components/Chip";
import { Dialog } from "../../src/components/Dialog";
import { SegmentedFilter } from "../../src/components/SegmentedFilter";
import { ExportSheet } from "../../src/components/ExportSheet";
import type { ExportSheetHandle } from "../../src/components/ExportSheet";
import { ApiTokenSheet } from "../../src/components/ApiTokenSheet";
import type { ApiTokenSheetHandle } from "../../src/components/ApiTokenSheet";
import { useToast } from "../../src/components/Toast";
import { formatBytes } from "../../src/lib/format";

/** S10 — settings: Account, Appearance & language, AI processing, Capture, Data, About. */
export default function SettingsTab() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 }}>
          {t("settings.title")}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 96, gap: 14 }}>
        <AccountSection />
        <AppearanceSection />
        <AiSection />
        <CaptureSection />
        <DataSection />
        <AboutSection />
      </ScrollView>
    </View>
  );
}

function AccountSection() {
  const { t } = useTranslation();
  const api = getApiClient();
  const toast = useToast();
  const router = useRouter();
  const { session, signOut } = useAuth();

  const [name, setName] = useState(session?.user.name ?? "");
  const [password, setPassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const save = useMutation({
    mutationFn: () => api.updateAccount({ name: name.trim() || undefined, password: password || undefined }),
    onSuccess: () => {
      setPassword("");
      toast.toast({ variant: "success", message: t("settings.passwordChanged") });
    },
    onError: () => toast.toast({ variant: "error", message: t("common.errorGeneric") }),
  });

  return (
    <SectionCard title={t("settings.sectionAccount")}>
      <Field label={t("settings.accountName")}>
        <Input value={name} onChangeText={setName} />
      </Field>
      <Field label={t("settings.accountEmail")}>
        <Input value={session?.user.email ?? ""} editable={false} />
      </Field>
      <Field label={t("settings.newPassword")} hint={t("auth.passwordMin")}>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder={t("settings.changePassword")}
        />
      </Field>
      <View style={styles.row}>
        <Button
          variant="primary"
          label={t("common.save")}
          loading={save.isPending}
          disabled={!password && name === session?.user.name}
          onPress={() => save.mutate()}
        />
        <Button
          variant="secondary"
          label={t("common.signOut")}
          onPress={() => void signOut().then(() => router.replace("/(auth)/login"))}
        />
      </View>
      <Button variant="danger" label={t("settings.deleteAccount")} onPress={() => setDeleteOpen(true)} fullWidth />

      {/* M6 — delete account with type-to-confirm */}
      <Dialog
        visible={deleteOpen}
        title={t("settings.deleteAccountTitle")}
        description={t("settings.deleteAccountBody", { email: session?.user.email ?? "" })}
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={() => setDeleteOpen(false)} />
            <Button
              variant="danger"
              label={t("settings.deleteAccount")}
              disabled={deleteConfirm !== session?.user.email}
              onPress={() => {
                setDeleteOpen(false);
                void api.deleteAccount().then(async () => {
                  await signOut();
                  toast.toast({ variant: "success", message: t("settings.accountDeleted") });
                  router.replace("/(auth)/login");
                });
              }}
            />
          </>
        }
      >
        <Field label={t("settings.deleteAccountConfirmLabel")}>
          <Input value={deleteConfirm} onChangeText={setDeleteConfirm} autoCapitalize="none" />
        </Field>
      </Dialog>
    </SectionCard>
  );
}

function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const { tokens, mode, setMode } = useTheme();

  return (
    <SectionCard title={t("settings.sectionAppearance")}>
      <SegmentedFilter
        ariaLabel={t("settings.appearanceTheme")}
        value={mode}
        onChange={(v) => setMode(v as ThemeMode)}
        options={[
          { value: "system", label: t("shell.themeSystem") },
          { value: "light", label: t("shell.themeLight") },
          { value: "dark", label: t("shell.themeDark") },
        ]}
      />
      <View style={styles.row}>
        <Text style={{ fontSize: 13, color: tokens.textSecondary, fontFamily: fonts.medium }}>
          {t("settings.appearanceLanguage")}
        </Text>
        {(["ru", "en"] as const).map((lng) => (
          <Chip
            key={lng}
            label={lng === "ru" ? "Русский" : "English"}
            active={i18n.resolvedLanguage === lng}
            onPress={() => setAppLanguage(lng)}
          />
        ))}
      </View>
    </SectionCard>
  );
}

function AiSection() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const api = getApiClient();
  const toast = useToast();

  const { data: settings, isPending } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => api.getAiSettings(),
  });

  const [form, setForm] = useState<AiSettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const saved = await api.saveAiSettings({ ...form, apiKey: apiKey || undefined });
      setForm(saved);
      setApiKey("");
      toast.toast({ variant: "success", message: t("settings.aiSaved") });
    },
    onError: () => toast.toast({ variant: "error", message: t("common.errorGeneric") }),
  });

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(await api.testAiConnection());
    } finally {
      setTesting(false);
    }
  };

  if (isPending || !form) {
    return (
      <SectionCard title={t("settings.sectionAi")}>
        <ActivityIndicator color={tokens.accent} />
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t("settings.sectionAi")}>
      <SegmentedFilter
        ariaLabel={t("settings.aiProvider")}
        value={form.provider}
        onChange={(v) => setForm({ ...form, provider: v as AiSettings["provider"] })}
        options={[
          { value: "openai", label: t("settings.aiProviderOpenai") },
          { value: "ollama", label: t("settings.aiProviderOllama") },
        ]}
      />
      <Field label={t("settings.aiBaseUrl")}>
        <Input value={form.baseUrl} onChangeText={(v) => setForm({ ...form, baseUrl: v })} autoCapitalize="none" keyboardType="url" />
      </Field>
      <Field label={t("settings.aiModel")}>
        <Input value={form.model} onChangeText={(v) => setForm({ ...form, model: v })} autoCapitalize="none" />
      </Field>
      <Field label={t("settings.aiApiKey")} hint={form.apiKeySet ? t("settings.aiApiKeyHint") : undefined}>
        <Input
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
          autoCapitalize="none"
          placeholder={form.apiKeySet ? t("settings.aiApiKeyPlaceholder") : ""}
        />
      </Field>

      <View style={styles.row}>
        <Button
          variant="secondary"
          label={testing ? t("settings.aiTesting") : t("settings.aiTest")}
          onPress={() => void testConnection()}
          disabled={testing}
        />
        {testResult ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              fontSize: 13,
              fontFamily: fonts.regular,
              color: testResult.ok ? tokens.success : tokens.danger,
              flexShrink: 1,
            }}
          >
            {testResult.ok ? t("settings.aiTestOk") : t("settings.aiTestFail")}
            {testResult.message ? `: ${testResult.message}` : ""}
          </Text>
        ) : null}
      </View>

      <View style={styles.switchRow}>
        <Text style={{ flex: 1, color: tokens.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
          {t("settings.aiAutoProcess")}
        </Text>
        <Switch
          accessibilityLabel={t("settings.aiAutoProcess")}
          value={form.autoProcess}
          onValueChange={(v) => setForm({ ...form, autoProcess: v })}
          trackColor={{ false: tokens.borderStrong, true: tokens.accent }}
          thumbColor="#F2F9F4"
        />
      </View>

      <Button variant="primary" label={t("common.save")} loading={save.isPending} onPress={() => save.mutate()} fullWidth />
    </SectionCard>
  );
}

function CaptureSection() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const tokenSheetRef = useRef<ApiTokenSheetHandle>(null);

  return (
    <SectionCard title={t("settings.sectionCapture")}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.textSecondary, fontFamily: fonts.regular }}>
        {t("settings.captureShareHint")}
      </Text>
      <View style={styles.row}>
        <Button variant="secondary" label={t("capture.title")} onPress={() => router.push("/capture")} />
        <Button variant="secondary" label={t("settings.captureTokens")} onPress={() => tokenSheetRef.current?.open()} />
      </View>
      <ApiTokenSheet ref={tokenSheetRef} />
    </SectionCard>
  );
}

function DataSection() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const api = getApiClient();
  const exportRef = useRef<ExportSheetHandle>(null);

  const { data: usage, isPending } = useQuery({ queryKey: ["usage"], queryFn: () => api.usage() });

  return (
    <SectionCard title={t("settings.sectionData")}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.textSecondary, fontFamily: fonts.regular }}>
        {t("settings.dataStorage")}:{" "}
        <Text style={{ color: tokens.text, fontFamily: fonts.medium, fontVariant: ["tabular-nums"] }}>
          {isPending ? "…" : formatBytes(usage?.bytesUsed ?? 0)}
        </Text>
      </Text>
      {features.export ? (
        <>
          <Button
            variant="primary"
            label={t("settings.dataExportAll")}
            onPress={() => exportRef.current?.open({ scope: "all" })}
            fullWidth
          />
          <ExportSheet ref={exportRef} />
        </>
      ) : null}
    </SectionCard>
  );
}

function AboutSection() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  return (
    <SectionCard title={t("settings.sectionAbout")}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.textSecondary, fontFamily: fonts.regular }}>
        {t("settings.aboutVersion")}:{" "}
        <Text style={{ color: tokens.text, fontFamily: fonts.medium }}>
          {APP_NAME} 0.1.0
        </Text>
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.textSecondary, fontFamily: fonts.regular }}>
        <Text style={{ color: tokens.textTertiary }}>{t("settings.aboutLicenses")}: </Text>
        {t("settings.aboutLicensesList")}
      </Text>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
  },
});
