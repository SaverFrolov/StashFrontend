import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { ExportOptions } from "@inbox/api-client";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { getApiClient } from "../api";
import { useToast } from "./Toast";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { CheckRow } from "./SectionCard";
import { SegmentedFilter } from "./SegmentedFilter";

export interface ExportSheetHandle {
  open: (opts?: { scope?: ExportOptions["scope"]; collectionId?: string; itemIds?: string[] }) => void;
}

/**
 * M7 — export sheet: scope (fixed by caller), format JSON/Markdown, include
 * toggles, then write to cache (legacy expo-file-system API) and hand over to
 * the system share sheet via expo-sharing.
 */
export const ExportSheet = forwardRef<ExportSheetHandle>(function ExportSheet(_props, ref) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const api = getApiClient();
  const toast = useToast();
  const sheetRef = useRef<BottomSheetModal>(null);

  const [scope, setScope] = useState<ExportOptions["scope"]>("all");
  const [collectionId, setCollectionId] = useState<string | undefined>();
  const [itemIds, setItemIds] = useState<string[] | undefined>();
  const [format, setFormat] = useState<"json" | "markdown">("json");
  const [includeOriginals, setIncludeOriginals] = useState(true);
  const [includeExtracted, setIncludeExtracted] = useState(true);
  const [includeAi, setIncludeAi] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (opts) => {
      setScope(opts?.scope ?? "all");
      setCollectionId(opts?.collectionId);
      setItemIds(opts?.itemIds);
      sheetRef.current?.present();
    },
  }));

  const runExport = async () => {
    setBusy(true);
    try {
      const result = await api.exportData({
        scope,
        collectionId: scope === "collection" ? collectionId : undefined,
        itemIds: scope === "selected" ? itemIds : undefined,
        format,
        includeOriginals,
        includeExtracted,
        includeAi,
        includeComments,
      });
      const uri = `${FileSystem.cacheDirectory ?? ""}${result.filename}`;
      await FileSystem.writeAsStringAsync(uri, result.data, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: result.mime, dialogTitle: t("modals.exportTitle") });
      }
      toast.toast({ variant: "success", message: t("modals.exportDone") });
      sheetRef.current?.dismiss();
    } catch {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet ref={sheetRef} title={t("modals.exportTitle")} snapPoints={["60%", "85%"]}>
      <View style={styles.body}>
        <Text style={{ color: tokens.textSecondary, fontFamily: fonts.medium, fontSize: 12 }}>
          {t("modals.exportFormat")}
        </Text>
        <SegmentedFilter
          ariaLabel={t("modals.exportFormat")}
          value={format}
          onChange={(v) => setFormat(v as "json" | "markdown")}
          compact
          options={[
            { value: "json", label: t("modals.exportFormatJson") },
            { value: "markdown", label: t("modals.exportFormatMarkdown") },
          ]}
        />

        <Text style={{ color: tokens.textSecondary, fontFamily: fonts.medium, fontSize: 12, marginTop: 8 }}>
          {t("modals.exportInclude")}
        </Text>
        <CheckRow label={t("modals.exportIncludeOriginals")} checked={includeOriginals} onChange={setIncludeOriginals} />
        <CheckRow label={t("modals.exportIncludeExtracted")} checked={includeExtracted} onChange={setIncludeExtracted} />
        <CheckRow label={t("modals.exportIncludeAi")} checked={includeAi} onChange={setIncludeAi} />
        <CheckRow label={t("modals.exportIncludeComments")} checked={includeComments} onChange={setIncludeComments} />

        <View style={styles.footer}>
          <Button
            variant="primary"
            label={busy ? t("modals.exportInProgress") : t("modals.exportRun")}
            loading={busy}
            onPress={() => void runExport()}
            fullWidth
          />
        </View>
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  body: { gap: 6, paddingBottom: 24 },
  footer: { marginTop: 12 },
});
