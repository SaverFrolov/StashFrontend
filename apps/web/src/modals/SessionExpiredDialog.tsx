import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogContent, DialogFooter, Field, Input } from "@inbox/ui";
import { useAuth } from "../state/auth";

/** M13: sign in again without losing the draft. */
export function SessionExpiredDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await signIn(email, password);
      onClose();
    } catch {
      setError(t("auth.invalidCredentials"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && navigate("/login")}>
      <DialogContent title={t("modals.sessionExpiredTitle")} closeLabel={t("common.close")}>
        <p className="text-base text-text-secondary">{t("modals.sessionExpiredBody")}</p>
        <Field label={t("auth.email")} htmlFor="se-email" error={error}>
          <Input
            id="se-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label={t("auth.password")} htmlFor="se-password">
          <Input
            id="se-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
          />
        </Field>
        <DialogFooter>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            {t("common.signIn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
