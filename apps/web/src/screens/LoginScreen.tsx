import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Field, Input } from "@inbox/ui";
import { APP_NAME } from "@inbox/api-client";
import { useAuth } from "../state/auth";

/** Shared centered 400px form layout for S1–S3: plain background, no hero. */
export function AuthLayout({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-auth-form">
        <h1 className="mb-1 text-center text-xl font-semibold text-text">{APP_NAME}</h1>
        <p className="mb-6 text-center text-base text-text-secondary">{title}</p>
        <form
          className="flex flex-col gap-4 rounded-dialog border border-glass-border bg-surface p-6 glass-rim"
          onSubmit={(e) => e.preventDefault()}
        >
          {children}
        </form>
        {footer && <div className="mt-4 text-center text-sm text-text-secondary">{footer}</div>}
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { t } = useTranslation();
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  if (session) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? "/inbox"} replace />;
  }

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await signIn(email, password);
      navigate("/inbox", { replace: true });
    } catch {
      setError(t("auth.invalidCredentials"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.loginTitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link to="/signup" className="text-accent underline-offset-2 hover:underline">
            {t("common.signUp")}
          </Link>
        </>
      }
    >
      <Field label={t("auth.email")} htmlFor="login-email" error={error}>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />
      </Field>
      <Field label={t("auth.password")} htmlFor="login-password">
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          required
        />
      </Field>
      <Button variant="primary" className="mt-2 w-full" onClick={() => void submit()} disabled={busy || !email || !password}>
        {busy ? t("common.loading") : t("common.signIn")}
      </Button>
      <Link to="/reset-password" className="text-center text-sm text-accent underline-offset-2 hover:underline">
        {t("auth.forgotPassword")}
      </Link>
    </AuthLayout>
  );
}
