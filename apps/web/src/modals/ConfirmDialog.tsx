import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, DialogContent, DialogFooter, Field, Input } from "@inbox/ui";
import type { ConfirmOptions } from "./ModalProvider";

/** M6: confirm destructive actions; optional type-to-confirm text. */
export function ConfirmDialog({ options, onClose }: { options: ConfirmOptions | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  if (!options) return null;

  const requiresText = Boolean(options.requireText);
  const canConfirm = !requiresText || typed === options.requireText;

  const confirm = async () => {
    setBusy(true);
    try {
      await options.onConfirm();
      onClose();
    } finally {
      setBusy(false);
      setTyped("");
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) {
          setTyped("");
          onClose();
        }
      }}
    >
      <DialogContent title={options.title} closeLabel={t("common.close")}>
        {options.body && <p className="text-base text-text-secondary">{options.body}</p>}
        {requiresText && (
          <Field label={options.requireTextLabel ?? ""} htmlFor="confirm-text">
            <Input
              id="confirm-text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={options.danger ? "danger" : "primary"}
            disabled={!canConfirm || busy}
            onClick={() => void confirm()}
          >
            {options.confirmLabel ?? t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
