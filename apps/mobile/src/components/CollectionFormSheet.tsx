import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Collection } from "@inbox/api-client";
import { getApiClient } from "../api";
import { useToast } from "./Toast";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { Field, Input } from "./Field";

export interface CollectionFormSheetHandle {
  open: (collection?: Collection) => void;
}

/** M3 — create/edit collection: name (required) + description. */
export const CollectionFormSheet = forwardRef<CollectionFormSheetHandle>(
  function CollectionFormSheet(_props, ref) {
    const { t } = useTranslation();
    const api = getApiClient();
    const toast = useToast();
    const queryClient = useQueryClient();

    const sheetRef = useRef<BottomSheetModal>(null);
    const [editing, setEditing] = useState<Collection | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | undefined>();

    useImperativeHandle(ref, () => ({
      open: (collection?: Collection) => {
        setEditing(collection ?? null);
        setName(collection?.name ?? "");
        setDescription(collection?.description ?? "");
        setError(undefined);
        sheetRef.current?.present();
      },
    }));

    const save = useMutation({
      mutationFn: async () => {
        if (editing) {
          await api.patchCollection(editing.id, { name, description });
        } else {
          await api.createCollection(name, description || undefined);
        }
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["collections"] });
        void queryClient.invalidateQueries({ queryKey: ["collection-counts"] });
        void queryClient.invalidateQueries({ queryKey: ["collection"] });
        toast.toast({
          variant: "success",
          message: editing ? t("collections.editCollection") : t("collections.createTitle"),
        });
        sheetRef.current?.dismiss();
      },
      onError: () => {
        toast.toast({ variant: "error", message: t("common.errorGeneric") });
      },
    });

    const submit = () => {
      if (!name.trim()) {
        setError(t("collections.nameRequired"));
        return;
      }
      save.mutate();
    };

    return (
      <Sheet
        ref={sheetRef}
        title={editing ? t("collections.editCollection") : t("collections.createTitle")}
        snapPoints={["45%"]}
      >
        <View style={styles.form}>
          <Field label={`${t("collections.name")} *`} error={error}>
            <Input value={name} onChangeText={setName} autoFocus returnKeyType="next" />
          </Field>
          <Field label={`${t("collections.description")} (${t("common.optional")})`}>
            <Input value={description} onChangeText={setDescription} multiline returnKeyType="done" onSubmitEditing={submit} />
          </Field>
          <View style={styles.buttons}>
            <Button variant="ghost" label={t("common.cancel")} onPress={() => sheetRef.current?.dismiss()} />
            <Button
              variant="primary"
              label={editing ? t("common.save") : t("common.create")}
              loading={save.isPending}
              onPress={submit}
            />
          </View>
        </View>
      </Sheet>
    );
  },
);

const styles = StyleSheet.create({
  form: {
    gap: 14,
    paddingTop: 4,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
