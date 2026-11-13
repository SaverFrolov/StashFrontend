import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Field, Input } from "@inbox/ui";
import { useAuth } from "../state/auth";
import { AuthLayout } from "./LoginScreen";

/** S2 /signup. */
export function SignupScreen() {
  const { t } = useTranslation();
  const { signUp, session } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ field?: "name" | "email" | "password"; message: string } | undefined>();
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/inbox" replace />;

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
      await signUp(name.trim(), email, password);
      navigate("/inbox", { replace: true });
    } catch {
      setError({ message: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.signupTitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="text-accent underline-offset-2 hover:underline">
            {t("common.signIn")}
          </Link>
        </>
      }
    >
      <Field label={t("auth.name")} htmlFor="signup-name" error={error?.field === "name" ? error.message : undefined}>
        <Input id="signup-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </Field>
      <Field label={t("auth.email")} htmlFor="signup-email" error={error?.field === "email" ? error.message : undefined}>
        <Input id="signup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field
        label={t("auth.password")}
        htmlFor="signup-password"
        hint={t("auth.passwordMin")}
        error={error?.field === "password" ? error.message : error?.field === undefined ? error?.message : undefined}
      >
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          required
        />
      </Field>
      <Button variant="primary" className="mt-2 w-full" onClick={() => void submit()} disabled={busy}>
        {busy ? t("common.loading") : t("common.signUp")}
      </Button>
    </AuthLayout>
  );
}
