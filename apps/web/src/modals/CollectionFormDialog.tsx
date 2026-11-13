import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogContent, DialogFooter, Field, Input, Textarea, useToast } from "@inbox/ui";
import type { Collection } from "@inbox/api-client";
import { useApi } from "../state/api";

/** M3: create/edit collection — name (required), description. */
export function CollectionFormDialog({
  open,
  collection,
  onClose,
}: {
  open: boolean;
  collection?: Collection;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setName(collection?.name ?? "");
      setDescription(collection?.description ?? "");
      setError(undefined);
    }
  }, [open, collection]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (collection) {
        await api.patchCollection(collection.id, { name, description });
      } else {
        await api.createCollection(name, description || undefined);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      void queryClient.invalidateQueries({ queryKey: ["collection-counts"] });
      toast.toast({ variant: "success", message: collection ? t("collections.editCollection") : t("collections.createTitle") });
      onClose();
    },
  });

  const submit = () => {
    if (!name.trim()) {
      setError(t("collections.nameRequired"));
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={collection ? t("collections.editCollection") : t("collections.createTitle")}
        closeLabel={t("common.close")}
      >
        <Field label={`${t("collections.name")} *`} htmlFor="col-name" error={error}>
          <Input
            id="col-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(undefined);
            }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </Field>
        <Field label={`${t("collections.description")} (${t("common.optional")})`} htmlFor="col-desc">
          <Textarea id="col-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={submit} disabled={mutation.isPending}>
            {collection ? t("common.save") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
