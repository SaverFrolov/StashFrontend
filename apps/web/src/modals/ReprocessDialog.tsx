import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogContent, DialogFooter, useToast } from "@inbox/ui";
import type { Item } from "@inbox/api-client";
import { useApi } from "../state/api";

/** M9: states exactly what is replaced and what is untouched. */
export function ReprocessDialog({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item?: Item;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => api.reprocessItem(id),
    onSuccess: () => {
      toast.toast({ variant: "success", message: t("item.reprocess") });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["item"] });
      onClose();
    },
    onError: () => {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    },
  });

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t("modals.reprocessTitle")} closeLabel={t("common.close")}>
        <p className="text-base text-text-secondary">{t("modals.reprocessBody")}</p>
        <ul className="flex flex-col gap-2 text-base">
          <li className="rounded-control border border-border p-3">
            <span className="font-medium text-text">{t("modals.reprocessReplaced")}</span>
          </li>
          <li className="rounded-control border border-border p-3">
            <span className="font-medium text-text">{t("modals.reprocessUntouched")}</span>
          </li>
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(item.id)}
          >
            {t("item.reprocess")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
