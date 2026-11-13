import { useTranslation } from "react-i18next";
import { MicOff } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter } from "@inbox/ui";

/** M10: microphone permission denied / unsupported browser. */
export function MicPermissionDialog({
  open,
  reason,
  onClose,
}: {
  open: boolean;
  reason?: "denied" | "unsupported";
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const denied = reason === "denied";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={denied ? t("recorder.micDeniedTitle") : t("recorder.micUnsupportedTitle")}
        closeLabel={t("common.close")}
      >
        <div className="flex items-start gap-3">
          <MicOff size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-danger" aria-hidden />
          <p className="text-base text-text-secondary">
            {denied ? t("recorder.micDeniedBody") : t("recorder.micUnsupportedBody")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="primary" onClick={onClose}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
