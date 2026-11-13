import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MailCheck } from "lucide-react";
import { Button, Field, Input } from "@inbox/ui";
import { useApi } from "../state/api";
import { AuthLayout } from "./LoginScreen";

/** S3 /reset-password — request state and "check your email" state in one screen. */
export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const api = useApi();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.requestPasswordReset(email);
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title={t("auth.resetSent")}
        footer={
          <Link to="/login" className="text-accent underline-offset-2 hover:underline">
            {t("common.signIn")}
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <MailCheck size={28} strokeWidth={1.5} className="text-accent" aria-hidden />
          <p className="text-base text-text-secondary">{t("auth.resetSentText")}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("auth.resetTitle")}
      footer={
        <Link to="/login" className="text-accent underline-offset-2 hover:underline">
          {t("common.signIn")}
        </Link>
      }
    >
      <p className="text-base text-text-secondary">{t("auth.resetText")}</p>
      <Field label={t("auth.email")} htmlFor="reset-email">
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          autoFocus
          required
        />
      </Field>
      <Button variant="primary" className="mt-2 w-full" onClick={() => void submit()} disabled={busy || !email}>
        {busy ? t("common.loading") : t("auth.resetSend")}
      </Button>
    </AuthLayout>
  );
}
