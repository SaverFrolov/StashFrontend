import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, Smartphone, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  Input,
  ItemCardSkeleton,
  Select,
  Switch,
  cn,
  useToast,
} from "@inbox/ui";
import type { AiSettings } from "@inbox/api-client";
import { config, features } from "@inbox/api-client";
import { useApi } from "../state/api";
import { useAuth } from "../state/auth";
import { useSettings } from "../state/settings";
import type { ThemeMode } from "../state/settings";
import { useModals } from "../modals/ModalProvider";
import { useInstallPrompt } from "../components/InstallBanner";
import { formatBytes } from "../lib/format";

const SECTIONS = ["account", "appearance", "ai", "capture", "data", "about"] as const;
type Section = (typeof SECTIONS)[number];

const sectionLabelKey: Record<Section, string> = {
  account: "settings.sectionAccount",
  appearance: "settings.sectionAppearance",
  ai: "settings.sectionAi",
  capture: "settings.sectionCapture",
  data: "settings.sectionData",
  about: "settings.sectionAbout",
};

/** S10 /settings — left sub-navigation on desktop; top tabs on mobile. */
export function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-settings flex-1 px-3 pb-12">
      <h1 className="mt-4 text-xl font-semibold text-text">{t("settings.title")}</h1>

      {/* Mobile: top tabs */}
      <nav className="mt-3 lg:hidden" aria-label={t("settings.title")}>
        <ul className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
          {SECTIONS.map((s) => (
            <li key={s}>
              <NavLink
                to={`/settings/${s}`}
                className={({ isActive }) =>
                  cn(
                    "block whitespace-nowrap border-b-2 px-3 py-2 text-base font-medium",
                    isActive
                      ? "border-accent text-text"
                      : "border-transparent text-text-secondary hover:text-text",
                  )
                }
              >
                {t(sectionLabelKey[s])}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-4 flex gap-6">
        {/* Desktop: left sub-navigation */}
        <nav className="hidden w-48 shrink-0 lg:block" aria-label={t("settings.title")}>
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <li key={s}>
                <NavLink
                  to={`/settings/${s}`}
                  className={({ isActive }) =>
                    cn(
                      "flex h-9 items-center rounded-control px-3 text-base",
                      isActive
                        ? "bg-accent-subtle font-medium text-accent"
                        : "text-text-secondary hover:bg-surface-subtle hover:text-text",
                    )
                  }
                >
                  {t(sectionLabelKey[s])}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <Routes>
            <Route index element={<AccountSection />} />
            <Route path="account" element={<AccountSection />} />
            <Route path="appearance" element={<AppearanceSection />} />
            <Route path="ai" element={<AiSection />} />
            <Route path="capture" element={<CaptureSection />} />
            <Route path="data" element={<DataSection />} />
            <Route path="about" element={<AboutSection />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-dialog border border-glass-border bg-surface p-4 glass-rim" aria-label={title}>
      <h2 className="mb-3 text-lg font-semibold text-text">{title}</h2>
      {children}
    </section>
  );
}

function AccountSection() {
  const { t } = useTranslation();
  const api = useApi();
  const { session, signOut } = useAuth();
  const toast = useToast();
  const { openConfirm } = useModals();
  const navigate = useNavigate();

  const [name, setName] = useState(session?.user.name ?? "");
  const [password, setPassword] = useState("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      await api.updateAccount({ name: name.trim() || undefined, password: password || undefined });
    },
    onSuccess: () => {
      setPassword("");
      toast.toast({ variant: "success", message: t("settings.passwordChanged") });
    },
  });

  const deleteAccount = () => {
    openConfirm({
      title: t("settings.deleteAccountTitle"),
      body: t("settings.deleteAccountBody", { email: session?.user.email ?? "" }),
      confirmLabel: t("settings.deleteAccount"),
      danger: true,
      requireText: session?.user.email,
      requireTextLabel: t("settings.deleteAccountConfirmLabel"),
      onConfirm: async () => {
        await api.deleteAccount();
        await signOut();
        navigate("/login");
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title={t("settings.sectionAccount")}>
        <div className="flex flex-col gap-4">
          <Field label={t("settings.accountName")} htmlFor="acc-name">
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("settings.accountEmail")} htmlFor="acc-email">
            <Input id="acc-email" value={session?.user.email ?? ""} readOnly disabled />
          </Field>
          <Field label={t("settings.newPassword")} htmlFor="acc-password" hint={t("auth.passwordMin")}>
            <Input
              id="acc-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("settings.changePassword")}
            />
          </Field>
          <div>
            <Button
              variant="primary"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || (!password && name === session?.user.name)}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("settings.deleteAccount")}>
        <Button variant="danger" onClick={deleteAccount}>
          <Trash2 size={14} strokeWidth={1.5} aria-hidden />
          {t("settings.deleteAccount")}
        </Button>
      </SectionCard>
    </div>
  );
}

function AppearanceSection() {
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage } = useSettings();

  return (
    <SectionCard title={t("settings.sectionAppearance")}>
      <div className="flex flex-col gap-4">
        <Field label={t("settings.appearanceLanguage")} htmlFor="set-lang">
          <Select
            id="set-lang"
            ariaLabel={t("settings.appearanceLanguage")}
            value={language}
            onValueChange={setLanguage}
            options={[
              { value: "ru", label: "Русский" },
              { value: "en", label: "English" },
            ]}
          />
        </Field>
        <Field label={t("settings.appearanceTheme")} htmlFor="set-theme">
          <Select
            id="set-theme"
            ariaLabel={t("settings.appearanceTheme")}
            value={theme}
            onValueChange={(v) => setTheme(v as ThemeMode)}
            options={[
              { value: "system", label: t("shell.themeSystem") },
              { value: "light", label: t("shell.themeLight") },
              { value: "dark", label: t("shell.themeDark") },
            ]}
          />
        </Field>
      </div>
    </SectionCard>
  );
}

function AiSection() {
  const { t } = useTranslation();
  const api = useApi();
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const saved = await api.saveAiSettings({ ...form, apiKey: apiKey || undefined });
      setForm(saved);
      setApiKey("");
      toast.toast({ variant: "success", message: t("settings.aiSaved") });
    },
  });

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testAiConnection();
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  if (isPending || !form) {
    return <ItemCardSkeleton />;
  }

  return (
    <SectionCard title={t("settings.sectionAi")}>
      <div className="flex flex-col gap-4">
        <Field label={t("settings.aiProvider")} htmlFor="ai-provider">
          <Select
            id="ai-provider"
            ariaLabel={t("settings.aiProvider")}
            value={form.provider}
            onValueChange={(v) => setForm({ ...form, provider: v as AiSettings["provider"] })}
            options={[
              { value: "openai", label: t("settings.aiProviderOpenai") },
              { value: "ollama", label: t("settings.aiProviderOllama") },
            ]}
          />
        </Field>
        <Field label={t("settings.aiBaseUrl")} htmlFor="ai-baseurl">
          <Input
            id="ai-baseurl"
            type="url"
            className="font-mono text-sm"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          />
        </Field>
        <Field label={t("settings.aiModel")} htmlFor="ai-model">
          <Input
            id="ai-model"
            className="font-mono text-sm"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
        </Field>
        <Field
          label={t("settings.aiApiKey")}
          htmlFor="ai-key"
          hint={form.apiKeySet ? t("settings.aiApiKeyHint") : undefined}
        >
          <Input
            id="ai-key"
            type="password"
            autoComplete="off"
            className="font-mono text-sm"
            placeholder={form.apiKeySet ? t("settings.aiApiKeyPlaceholder") : ""}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => void testConnection()} disabled={testing}>
            {testing ? t("settings.aiTesting") : t("settings.aiTest")}
          </Button>
          {testResult && (
            <p
              role="status"
              className={cn("text-sm", testResult.ok ? "text-success" : "text-danger")}
            >
              {testResult.ok ? t("settings.aiTestOk") : t("settings.aiTestFail")}
              {testResult.message ? `: ${testResult.message}` : ""}
            </p>
          )}
        </div>

        <Switch
          id="ai-auto"
          checked={form.autoProcess}
          onCheckedChange={(v) => setForm({ ...form, autoProcess: v })}
          label={t("settings.aiAutoProcess")}
        />

        <div>
          <Button variant="primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function CaptureSection() {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { canInstall, install } = useInstallPrompt();

  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenDays, setTokenDays] = useState("90");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const { data: tokens } = useQuery({ queryKey: ["api-tokens"], queryFn: () => api.listApiTokens() });

  const serverUrl = window.location.origin;

  const createToken = useMutation({
    mutationFn: async () => {
      const days = tokenDays ? Number(tokenDays) : undefined;
      const result = await api.createApiToken(tokenName.trim(), days && days > 0 ? days : undefined);
      setRevealedSecret(result.secret);
      setTokenName("");
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title={t("settings.captureExtension")}>
        <p className="whitespace-pre-line text-base text-text-secondary">{t("settings.captureExtensionSteps")}</p>
        <div className="mt-3 flex items-center gap-2">
          <label className="text-sm text-text-tertiary" htmlFor="server-url">
            {t("settings.captureServerUrl")}
          </label>
          <code id="server-url" className="rounded border border-border bg-surface-subtle px-2 py-1 font-mono text-xs text-text">
            {serverUrl}
          </code>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t("common.copy")}
            onClick={() => {
              void navigator.clipboard.writeText(serverUrl);
              toast.toast({ variant: "success", message: t("common.copied") });
            }}
          >
            <Copy size={14} strokeWidth={1.5} aria-hidden />
          </Button>
        </div>
      </SectionCard>

      <SectionCard title={t("settings.capturePhone")}>
        <div className="flex items-start gap-3">
          <Smartphone size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-text-tertiary" aria-hidden />
          <div>
            <p className="text-base text-text-secondary">{t("settings.capturePhoneHint")}</p>
            {canInstall ? (
              <Button variant="primary" size="sm" className="mt-2" onClick={() => void install()}>
                {t("settings.captureInstallApp")}
              </Button>
            ) : (
              <p className="mt-2 text-sm text-text-tertiary">{t("settings.captureInstallUnsupported")}</p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("settings.captureTokens")}>
        <ul className="flex flex-col">
          {(tokens ?? []).map((tok) => (
            <li key={tok.id} className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
              <KeyRound size={16} strokeWidth={1.5} className="shrink-0 text-text-tertiary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base text-text">{tok.name}</span>
                <span className="tnum block text-xs text-text-tertiary">
                  {tok.expiresAt ? new Date(tok.expiresAt).toLocaleDateString() : t("settings.tokenNeverExpires")}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                onClick={() =>
                  api.revokeApiToken(tok.id).then(() => {
                    void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
                    toast.toast({ variant: "success", message: t("settings.tokenRevoked") });
                  })
                }
              >
                {t("settings.tokenRevoke")}
              </Button>
            </li>
          ))}
          {(tokens ?? []).length === 0 && (
            <li className="py-2 text-base text-text-tertiary">{t("settings.tokenNoTokens")}</li>
          )}
        </ul>
        <Button size="sm" className="mt-2" onClick={() => setTokenDialogOpen(true)}>
          <Plus size={14} strokeWidth={1.5} aria-hidden />
          {t("settings.captureCreateToken")}
        </Button>
      </SectionCard>

      {/* M12: create API token + reveal-once dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={(o) => !o && setTokenDialogOpen(false)}>
        <DialogContent title={t("settings.captureCreateToken")} closeLabel={t("common.close")}>
          <Field label={t("settings.tokenName")} htmlFor="tok-name">
            <Input id="tok-name" autoFocus value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
          </Field>
          <Field label={t("settings.tokenExpiry")} htmlFor="tok-days">
            <Input
              id="tok-days"
              type="number"
              min={1}
              value={tokenDays}
              onChange={(e) => setTokenDays(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTokenDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              disabled={!tokenName.trim() || createToken.isPending}
              onClick={() => {
                createToken.mutate(undefined, {
                  onSuccess: () => setTokenDialogOpen(false),
                });
              }}
            >
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revealedSecret !== null} onOpenChange={(o) => !o && setRevealedSecret(null)}>
        <DialogContent title={t("settings.tokenCreated")} closeLabel={t("common.close")}>
          <p className="text-base text-text-secondary">{t("settings.tokenSecretOnce")}</p>
          <code className="block truncate rounded-control border border-border bg-surface-subtle px-3 py-2 font-mono text-sm text-text">
            {revealedSecret}
          </code>
          <DialogFooter>
            <Button
              variant="primary"
              onClick={() => {
                void navigator.clipboard.writeText(revealedSecret ?? "");
                toast.toast({ variant: "success", message: t("common.copied") });
              }}
            >
              <Copy size={14} strokeWidth={1.5} aria-hidden />
              {t("common.copy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DataSection() {
  const { t } = useTranslation();
  const api = useApi();
  const { openExport } = useModals();
  const { data: usage, isPending } = useQuery({ queryKey: ["usage"], queryFn: () => api.usage() });

  return (
    <SectionCard title={t("settings.sectionData")}>
      <div className="flex flex-col gap-4">
        <p className="text-base text-text-secondary">
          {t("settings.dataStorage")}:{" "}
          <span className="tnum font-medium text-text">
            {isPending ? "…" : formatBytes(usage?.bytesUsed ?? 0)}
          </span>
        </p>
        {features.export && (
          <div>
            <Button variant="primary" onClick={() => openExport({ scope: "all" })}>
              {t("settings.dataExportAll")}
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function AboutSection() {
  const { t } = useTranslation();
  return (
    <SectionCard title={t("settings.sectionAbout")}>
      <dl className="flex flex-col gap-3 text-base">
        <div>
          <dt className="text-text-tertiary">{t("settings.aboutVersion")}</dt>
          <dd className="tnum font-mono text-text">{config.appName} 0.1.0</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t("settings.aboutLicenses")}</dt>
          <dd className="text-text-secondary">{t("settings.aboutLicensesList")}</dd>
        </div>
      </dl>
    </SectionCard>
  );
}
