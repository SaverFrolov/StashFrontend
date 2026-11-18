import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { getApiClient } from "../api";
import { useToast } from "./Toast";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Field, Input } from "./Field";

export interface ApiTokenSheetHandle {
  open: () => void;
}

/** M12 — API tokens: list with revoke, create form, reveal-once secret dialog. */
export const ApiTokenSheet = forwardRef<ApiTokenSheetHandle>(function ApiTokenSheet(_props, ref) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const api = getApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const sheetRef = useRef<BottomSheetModal>(null);

  const [name, setName] = useState("");
  const [days, setDays] = useState("90");
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.present(),
  }));

  const { data: apiTokens } = useQuery({ queryKey: ["api-tokens"], queryFn: () => api.listApiTokens() });

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const parsedDays = days ? Number(days) : undefined;
      const result = await api.createApiToken(name.trim(), parsedDays && parsedDays > 0 ? parsedDays : undefined);
      setSecret(result.secret);
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    } catch {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await api.revokeApiToken(id);
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
      toast.toast({ variant: "success", message: t("settings.tokenRevoked") });
    } catch {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    }
  };

  return (
    <>
      <Sheet ref={sheetRef} title={t("settings.captureTokens")} snapPoints={["60%", "85%"]}>
        <FlatList
          data={apiTokens ?? []}
          keyExtractor={(tok) => tok.id}
          ListEmptyComponent={
            <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 14, paddingVertical: 10 }}>
              {t("settings.tokenNoTokens")}
            </Text>
          }
          renderItem={({ item: tok }) => (
            <View style={[styles.tokenRow, { borderBottomColor: tokens.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <KeyRound size={16} color={tokens.textTertiary} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 14 }}>
                  {tok.name}
                </Text>
                <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11 }}>
                  {tok.expiresAt ? new Date(tok.expiresAt).toLocaleDateString() : t("settings.tokenNeverExpires")}
                </Text>
              </View>
              <Button size="sm" variant="danger" label={t("settings.tokenRevoke")} onPress={() => void revoke(tok.id)} />
            </View>
          )}
        />

        <View style={styles.form}>
          <Field label={t("settings.tokenName")}>
            <Input value={name} onChangeText={setName} autoCapitalize="none" />
          </Field>
          <Field label={t("settings.tokenExpiry")}>
            <Input value={days} onChangeText={setDays} keyboardType="number-pad" />
          </Field>
          <Button
            variant="primary"
            label={t("settings.captureCreateToken")}
            disabled={!name.trim()}
            loading={busy}
            onPress={() => void create()}
            fullWidth
          />
        </View>
      </Sheet>

      {/* Reveal-once secret */}
      <Dialog
        visible={secret !== null}
        title={t("settings.tokenCreated")}
        description={t("settings.tokenSecretOnce")}
        onClose={() => setSecret(null)}
        footer={
          <Button
            variant="primary"
            label={t("common.copy")}
            onPress={async () => {
              await Clipboard.setStringAsync(secret ?? "");
              toast.toast({ variant: "success", message: t("common.copied") });
            }}
          />
        }
      >
        <View style={[styles.secretBox, { borderColor: tokens.borderStrong, borderRadius: radii.control, backgroundColor: tokens.surfaceSubtle }]}>
          <Text numberOfLines={1} selectable style={{ color: tokens.text, fontFamily: fonts.regular, fontSize: 13 }}>
            {secret}
          </Text>
        </View>
      </Dialog>
    </>
  );
});

const styles = StyleSheet.create({
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  form: {
    gap: 12,
    paddingTop: 12,
    paddingBottom: 24,
  },
  secretBox: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
