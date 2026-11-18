import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  File as FileIcon,
  FolderPlus,
  Link2,
  MoreHorizontal,
  Music,
  Pencil,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  Trash2,
  Video as VideoIcon,
  X,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { VideoView, useVideoPlayer } from "expo-video";
import type { Item, ItemPatch } from "@inbox/api-client";
import { radii, rgba, statusLabelKey } from "@inbox/ui-core";
import { fonts, useTheme } from "../../src/theme/ThemeProvider";
import { getApiClient, onItemUpdated } from "../../src/api";
import { useAuth } from "../../src/state/AuthContext";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { StatusChip } from "../../src/components/StatusChip";
import { Chip, TagChip } from "../../src/components/Chip";
import { TagCombobox } from "../../src/components/TagCombobox";
import { ActionMenu } from "../../src/components/ActionMenu";
import type { ActionMenuItem } from "../../src/components/ActionMenu";
import { Button } from "../../src/components/Button";
import { Dialog } from "../../src/components/Dialog";
import { GlassSurface } from "../../src/components/GlassSurface";
import { AddToCollectionSheet } from "../../src/components/AddToCollectionSheet";
import type { AddToCollectionSheetHandle } from "../../src/components/AddToCollectionSheet";
import { ProcessingSheet } from "../../src/components/ProcessingSheet";
import { useToast } from "../../src/components/Toast";
import { domainOf, formatBytes, formatDate } from "../../src/lib/format";

/** Collapsible section with a quiet header (web Section parity). */
function Section({
  title,
  children,
  defaultOpen = true,
  actions,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { tokens } = useTheme();
  return (
    <View style={[styles.section, { borderBottomColor: tokens.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.sectionHeaderRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
          style={styles.sectionHeader}
        >
          <View style={{ transform: [{ rotate: open ? "0deg" : "-90deg" }] }}>
            <ChevronDown size={16} color={tokens.textTertiary} strokeWidth={1.5} />
          </View>
          <Text numberOfLines={1} style={{ flex: 1, color: tokens.text, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 }}>
            {title}
          </Text>
        </Pressable>
        {actions}
      </View>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function AudioRow({ uri, label }: { uri: string; label: string }) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  return (
    <View style={styles.mediaRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("recorder.preview")}
        onPress={() => (status?.playing ? player.pause() : player.play())}
        style={({ pressed }) => [styles.mediaBtn, { borderColor: tokens.borderStrong }, pressed && { opacity: 0.7 }]}
      >
        {status?.playing ? (
          <Pause size={18} color={tokens.text} strokeWidth={1.5} />
        ) : (
          <Play size={18} color={tokens.text} strokeWidth={1.5} />
        )}
      </Pressable>
      <Text numberOfLines={1} style={{ flex: 1, color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 13 }}>
        {label}
      </Text>
    </View>
  );
}

function VideoBlock({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
  );
}

/** S5 — item detail: 4 separate layers, AI label & warning, restore AI, tags, collections, related, M8/M9. */
export default function ItemDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const api = getApiClient();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session, ready } = useAuth();

  const addSheetRef = useRef<AddToCollectionSheetHandle>(null);
  const processingRef = useRef<BottomSheetModal>(null);

  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [reprocessOpen, setReprocessOpen] = useState(false);

  const itemQuery = useQuery({
    queryKey: ["item", id],
    queryFn: () => api.getItem(id!),
    enabled: Boolean(id),
  });
  const relatedQuery = useQuery({
    queryKey: ["related", id],
    queryFn: () => api.relatedItems(id!, 5),
    enabled: Boolean(id),
  });
  const collectionsQuery = useQuery({ queryKey: ["collections"], queryFn: () => api.listCollections() });

  // Live pipeline updates for this item
  useEffect(() => {
    return onItemUpdated((updatedId) => {
      if (updatedId === id) {
        void queryClient.invalidateQueries({ queryKey: ["item", id] });
      }
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    });
  }, [id, queryClient]);

  const patch = useMutation({
    mutationFn: (p: ItemPatch) => api.patchItem(id!, p),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["item", id] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: () => toast.toast({ variant: "error", message: t("common.errorGeneric") }),
  });

  if (!ready) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  if (itemQuery.isPending) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="" />
        <View style={styles.center}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </View>
    );
  }

  const item = itemQuery.data;
  if (!item || itemQuery.isError) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="" />
        <View style={styles.center}>
          <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14 }}>
            {t("common.errorGeneric")}
          </Text>
          <Button size="sm" variant="secondary" label={t("common.retry")} onPress={() => void itemQuery.refetch()} />
        </View>
      </View>
    );
  }

  const itemCollections = (collectionsQuery.data ?? []).filter((c) => item.collectionIds.includes(c.id));
  const TypeIcon = item.type === "video" ? VideoIcon : item.type === "audio" ? Music : item.source.url ? Link2 : FileIcon;

  const openOriginal = async () => {
    const url = item.source.url;
    const fileUrl = item.original.file?.url;
    try {
      if (url && /^https?:/.test(url)) {
        await Linking.openURL(url);
      } else if (fileUrl && /^(file|content):/.test(fileUrl)) {
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUrl);
        else await Linking.openURL(fileUrl);
      } else {
        toast.toast({ variant: "error", message: t("common.errorGeneric") });
      }
    } catch {
      toast.toast({ variant: "error", message: t("common.errorGeneric") });
    }
  };

  const deleteItem = () => {
    const backup = item;
    void (async () => {
      await api.deleteItems([backup.id]);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.toast({
        variant: "undo",
        message: t("item.deletedUndo"),
        undoLabel: t("common.undo"),
        durationMs: 8000,
        onUndo: async () => {
          await api.saveText({ text: backup.original.text ?? backup.title, comment: backup.userComment });
          void queryClient.invalidateQueries({ queryKey: ["feed"] });
        },
      });
      router.back();
    })().catch(() => toast.toast({ variant: "error", message: t("common.errorGeneric") }));
  };

  const menuItems: ActionMenuItem[] = [
    {
      key: "reprocess",
      label: t("item.reprocess"),
      icon: <RefreshCcw size={16} color={tokens.textSecondary} strokeWidth={1.5} />,
      onSelect: () => setReprocessOpen(true),
    },
    ...(item.source.url
      ? [
          {
            key: "copy",
            label: t("item.copyLink"),
            icon: <Copy size={16} color={tokens.textSecondary} strokeWidth={1.5} />,
            onSelect: async () => {
              await Clipboard.setStringAsync(item.source.url!);
              toast.toast({ variant: "success", message: t("common.copied") });
            },
          },
        ]
      : []),
    {
      key: "delete",
      label: t("item.deleteItem"),
      icon: <Trash2 size={16} color={tokens.danger} strokeWidth={1.5} />,
      danger: true,
      onSelect: deleteItem,
    },
  ];

  const attentionHint =
    item.status === "partial"
      ? item.type === "audio"
        ? t("status.partialAudio")
        : t("status.partialLink")
      : item.status === "ai_failed"
        ? t("status.aiFailedHint")
        : undefined;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={item.title}
        right={
          <ActionMenu
            items={menuItems}
            trigger={(open) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.settings")}
                onPress={open}
                hitSlop={6}
                style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
              >
                <MoreHorizontal size={18} color={tokens.textSecondary} strokeWidth={1.5} />
              </Pressable>
            )}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 4 }}>
        {/* Title (editable) + source line + status */}
        {titleDraft !== null ? (
          <View style={styles.titleEditRow}>
            <TextInput
              autoFocus
              value={titleDraft}
              onChangeText={setTitleDraft}
              onSubmitEditing={() => {
                void patch.mutateAsync({ title: titleDraft });
                setTitleDraft(null);
              }}
              style={{
                flex: 1,
                color: tokens.text,
                fontFamily: fonts.semibold,
                fontSize: 19,
                lineHeight: 27,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: tokens.borderStrong,
                paddingVertical: 4,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.save")}
              onPress={() => {
                void patch.mutateAsync({ title: titleDraft });
                setTitleDraft(null);
              }}
              hitSlop={6}
              style={styles.headerBtn}
            >
              <Check size={18} color={tokens.accent} strokeWidth={2} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.cancel")}
              onPress={() => setTitleDraft(null)}
              hitSlop={6}
              style={styles.headerBtn}
            >
              <X size={18} color={tokens.textSecondary} strokeWidth={1.5} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <Text style={{ flex: 1, color: tokens.text, fontFamily: fonts.semibold, fontSize: 19, lineHeight: 27 }}>
              {item.title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("item.editTitle")}
              onPress={() => setTitleDraft(item.title)}
              hitSlop={6}
              style={styles.headerBtn}
            >
              <Pencil size={15} color={tokens.textSecondary} strokeWidth={1.5} />
            </Pressable>
          </View>
        )}

        <View style={styles.sourceRow}>
          <TypeIcon size={13} color={tokens.textTertiary} strokeWidth={1.5} />
          {item.source.url || item.original.file ? (
            <Text numberOfLines={1} style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12 }}>
              {item.source.url ? domainOf(item.source.url) : item.original.file?.name}
            </Text>
          ) : null}
          <Text style={{ color: tokens.textTertiary, fontSize: 12 }}>·</Text>
          <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12, fontVariant: ["tabular-nums"] }}>
            {formatDate(item.capturedAt)}
          </Text>
          {item.source.publishedAt ? (
            <>
              <Text style={{ color: tokens.textTertiary, fontSize: 12 }}>·</Text>
              <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12 }}>
                {t("item.publishedAt")}: {formatDate(item.source.publishedAt)}
              </Text>
            </>
          ) : null}
          {item.lang ? (
            <View style={[styles.langBadge, { borderColor: tokens.border }]}>
              <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 9, textTransform: "uppercase" }}>
                {item.lang}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statusRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("item.processingDetails")}
            onPress={() => processingRef.current?.present()}
          >
            <StatusChip status={item.status} label={t(statusLabelKey(item.status))} />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        {attentionHint ? (
          <View style={[styles.hintBox, { borderColor: rgba(tokens.warningRgb, 0.4), backgroundColor: tokens.surfaceSubtle }]}>
            <Text accessibilityRole="text" style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 }}>
              {attentionHint}
            </Text>
          </View>
        ) : null}
        {item.status === "partial" && item.type === "link" ? (
          <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 4 }}>
            {t("item.linkOnlyWarning")}
          </Text>
        ) : null}

        <View style={styles.actionsRow}>
          {item.source.url || item.original.file ? (
            <Button
              variant="primary"
              size="sm"
              label={t("item.openOriginal")}
              icon={
                item.original.file ? (
                  <Download size={14} color="#FFFFFF" strokeWidth={1.5} />
                ) : (
                  <ExternalLink size={14} color="#FFFFFF" strokeWidth={1.5} />
                )
              }
              onPress={() => void openOriginal()}
            />
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            label={t("item.addToCollection")}
            icon={<FolderPlus size={14} color={tokens.text} strokeWidth={1.5} />}
            onPress={() => addSheetRef.current?.open([item.id])}
          />
        </View>

        {/* 1. Original */}
        <Section title={t("item.original")}>
          {item.type === "link" && item.source.url ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(item.source.url!)}
              style={({ pressed }) => [styles.linkCard, { borderColor: tokens.glassBorder }, pressed && { opacity: 0.8 }]}
            >
              <Link2 size={18} color={tokens.textTertiary} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 14 }}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11 }}>
                  {item.source.url}
                </Text>
                <Text style={{ color: tokens.accent, fontFamily: fonts.regular, fontSize: 12 }}>
                  {domainOf(item.source.url)}
                </Text>
              </View>
            </Pressable>
          ) : null}

          {item.original.file && item.type !== "audio" && item.type !== "video" ? (
            <View style={[styles.fileRow, { borderColor: tokens.glassBorder }]}>
              <FileIcon size={18} color={tokens.textTertiary} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 14 }}>
                  {item.original.file.name}
                </Text>
                <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11, fontVariant: ["tabular-nums"] }}>
                  {t("item.fileSize", { size: formatBytes(item.original.file.size) })}
                </Text>
              </View>
            </View>
          ) : null}

          {item.original.text ? (
            <Text selectable style={{ color: tokens.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 }}>
              {item.original.text}
            </Text>
          ) : null}

          {item.type === "audio" && item.original.file ? (
            <AudioRow uri={item.original.file.url} label={item.original.file.name} />
          ) : null}

          {item.type === "video" && item.original.file ? <VideoBlock uri={item.original.file.url} /> : null}

          {!item.original.text && !item.original.file && !item.source.url ? (
            <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 14 }}>
              {t("item.noOriginalText")}
            </Text>
          ) : null}
        </Section>

        {/* 2. My comment */}
        <Section title={t("item.myComment")}>
          {commentDraft !== null ? (
            <View style={{ gap: 8 }}>
              <TextInput
                autoFocus
                multiline
                value={commentDraft}
                onChangeText={setCommentDraft}
                placeholder={t("item.commentPlaceholder")}
                placeholderTextColor={tokens.textTertiary}
                style={[
                  styles.draftInput,
                  { color: tokens.text, borderColor: tokens.borderStrong, backgroundColor: tokens.surface },
                ]}
              />
              <View style={styles.draftButtons}>
                <Button
                  size="sm"
                  variant="primary"
                  label={t("common.save")}
                  onPress={() => {
                    void patch.mutateAsync({ userComment: commentDraft || undefined });
                    setCommentDraft(null);
                  }}
                />
                <Button size="sm" variant="ghost" label={t("common.cancel")} onPress={() => setCommentDraft(null)} />
              </View>
            </View>
          ) : item.userComment ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t("item.myComment")} — ${t("common.edit")}`}
              onPress={() => setCommentDraft(item.userComment ?? "")}
              style={({ pressed }) => [
                styles.commentBox,
                { borderLeftColor: tokens.accent, backgroundColor: tokens.surfaceSubtle },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text selectable style={{ color: tokens.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 24 }}>
                {item.userComment}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setCommentDraft("")}
              style={({ pressed }) => [
                styles.commentPlaceholder,
                { borderColor: tokens.borderStrong },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 14 }}>
                {t("item.commentPlaceholder")}
              </Text>
            </Pressable>
          )}
        </Section>

        {/* 3. AI annotation */}
        <Section
          title={t("item.aiAnnotation")}
          actions={
            <View style={[styles.aiBadgeBig, { borderColor: tokens.border }]}>
              <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 10 }}>{t("item.aiLabel")}</Text>
            </View>
          }
        >
          <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginBottom: 8 }}>
            {t("item.aiNotice")}
          </Text>
          {aiDraft !== null ? (
            <View style={{ gap: 8 }}>
              <TextInput
                autoFocus
                multiline
                value={aiDraft}
                onChangeText={setAiDraft}
                style={[
                  styles.draftInput,
                  { color: tokens.text, borderColor: tokens.borderStrong, backgroundColor: tokens.surface },
                ]}
              />
              <View style={styles.draftButtons}>
                <Button
                  size="sm"
                  variant="primary"
                  label={t("common.save")}
                  onPress={() => {
                    void patch.mutateAsync({ aiAnnotation: aiDraft, aiEdited: true });
                    setAiDraft(null);
                  }}
                />
                <Button size="sm" variant="ghost" label={t("common.cancel")} onPress={() => setAiDraft(null)} />
                {item.ai.edited ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    label={t("item.restoreAi")}
                    icon={<RotateCcw size={13} color={tokens.textSecondary} strokeWidth={1.5} />}
                    onPress={() => {
                      void patch.mutateAsync({ restoreAi: true });
                      setAiDraft(null);
                    }}
                  />
                ) : null}
              </View>
            </View>
          ) : item.ai.annotation ? (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t("item.aiAnnotation")} — ${t("common.edit")}`}
                onPress={() => setAiDraft(item.ai.annotation ?? "")}
              >
                <Text selectable style={{ color: tokens.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 }}>
                  {item.ai.annotation}
                  {item.ai.edited ? (
                    <Text style={{ color: tokens.textTertiary, fontSize: 12 }}> ({t("common.edit")})</Text>
                  ) : null}
                </Text>
              </Pressable>
              <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11, marginTop: 8 }}>
                {t("item.aiModel", { model: item.ai.model })}
                {item.ai.generatedAt ? ` · ${t("item.aiGeneratedAt", { date: formatDate(item.ai.generatedAt) })}` : ""}
              </Text>
            </View>
          ) : (
            <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 14 }}>
              {item.status === "ai_failed" ? t("status.aiFailedHint") : t("status.annotating")}
            </Text>
          )}
        </Section>

        {/* 4. Tags (M4) */}
        <Section title={t("item.tags")}>
          <View style={styles.tagsWrap}>
            {item.userTags.map((tag) => (
              <TagChip
                key={`u-${tag}`}
                label={tag}
                removeLabel={t("item.removeTag")}
                onRemove={() => patch.mutate({ userTags: item.userTags.filter((x) => x !== tag) })}
              />
            ))}
            {item.suggestedTags
              .filter((s) => !item.userTags.includes(s))
              .map((tag) => (
                <TagChip
                  key={`s-${tag}`}
                  label={tag}
                  suggested
                  acceptLabel={t("item.acceptTag")}
                  removeLabel={t("item.removeTag")}
                  onAccept={() => patch.mutate({ acceptSuggestedTag: tag })}
                  onRemove={() => patch.mutate({ removeSuggestedTag: tag })}
                />
              ))}
            <TagCombobox
              exclude={item.userTags}
              onAdd={(tag) => patch.mutate({ userTags: [...new Set([...item.userTags, tag])] })}
            />
          </View>
        </Section>

        {/* 5. Collections */}
        <Section title={t("item.collections")}>
          <View style={styles.tagsWrap}>
            {itemCollections.map((c) => (
              <Chip key={c.id} label={c.name} onPress={() => router.push(`/collections/${c.id}`)} />
            ))}
            <Chip
              dashed
              label={`+ ${t("item.addToCollection")}`}
              onPress={() => addSheetRef.current?.open([item.id])}
            />
          </View>
        </Section>

        {/* 6. Extracted text — collapsed by default */}
        <Section
          title={t("item.extractedText")}
          defaultOpen={false}
          actions={
            item.extracted.text ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("item.copyText")}
                hitSlop={6}
                style={styles.headerBtn}
                onPress={async () => {
                  await Clipboard.setStringAsync(item.extracted.text ?? "");
                  toast.toast({ variant: "success", message: t("common.copied") });
                }}
              >
                <Copy size={14} color={tokens.textSecondary} strokeWidth={1.5} />
              </Pressable>
            ) : undefined
          }
        >
          {item.extracted.error ? (
            <View style={[styles.errorBox, { borderColor: rgba(tokens.dangerRgb, 0.4), backgroundColor: tokens.surface }]}>
              <Text style={{ color: tokens.danger, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
                {item.extracted.error}
              </Text>
              <Button
                size="sm"
                variant="secondary"
                label={t("item.retryExtraction")}
                icon={<RotateCcw size={13} color={tokens.text} strokeWidth={1.5} />}
                onPress={() =>
                  void api.retryExtraction(item.id).then(() => {
                    void queryClient.invalidateQueries({ queryKey: ["item", id] });
                    void queryClient.invalidateQueries({ queryKey: ["feed"] });
                  })
                }
              />
            </View>
          ) : item.extracted.text ? (
            <Text selectable style={{ color: tokens.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 }}>
              {item.extracted.text}
            </Text>
          ) : (
            <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 14 }}>
              {t("status.extracting")}
            </Text>
          )}
        </Section>

        {/* 7. Related items */}
        {(relatedQuery.data ?? []).length > 0 ? (
          <Section title={t("item.relatedItems")}>
            <View>
              {(relatedQuery.data ?? []).map((rel) => (
                <Pressable
                  key={rel.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/items/${rel.id}`)}
                  style={({ pressed }) => [
                    styles.relatedRow,
                    { borderBottomColor: tokens.border, borderBottomWidth: StyleSheet.hairlineWidth },
                    pressed && { backgroundColor: tokens.surfaceSubtle },
                  ]}
                >
                  <Text numberOfLines={1} style={{ flex: 1, color: tokens.text, fontFamily: fonts.regular, fontSize: 14 }}>
                    {rel.title}
                  </Text>
                  <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11, fontVariant: ["tabular-nums"] }}>
                    {formatDate(rel.capturedAt)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>
        ) : null}

        {/* 8. Processing details — collapsed */}
        <Section title={t("item.processingDetails")} defaultOpen={false}>
          <View style={{ gap: 6 }}>
            {item.processing.map((step, i) => (
              <View key={`${step.name}-${i}`} style={styles.procRow}>
                <Text style={{ width: 130, color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 13 }}>
                  {step.name === "extract" ? t("item.stepExtract") : t("item.stepAnnotate")}
                </Text>
                <Text
                  style={{
                    color:
                      step.status === "failed"
                        ? tokens.danger
                        : step.status === "ok"
                          ? tokens.success
                          : tokens.textTertiary,
                    fontFamily: fonts.regular,
                    fontSize: 13,
                  }}
                >
                  {t(
                    step.status === "pending"
                      ? "item.stepPending"
                      : step.status === "running"
                        ? "item.stepRunning"
                        : step.status === "ok"
                          ? "item.stepOk"
                          : step.status === "failed"
                            ? "item.stepFailed"
                            : "item.stepSkipped",
                  )}
                </Text>
              </View>
            ))}
            <Button
              size="sm"
              variant="ghost"
              label={t("modals.processingTitle")}
              onPress={() => processingRef.current?.present()}
            />
          </View>
        </Section>
      </ScrollView>

      <AddToCollectionSheet ref={addSheetRef} />
      <ProcessingSheet
        ref={processingRef}
        item={item}
        onRetry={(target) => {
          processingRef.current?.dismiss();
          void api.retryExtraction(target.id).then(() => {
            void queryClient.invalidateQueries({ queryKey: ["item", id] });
            void queryClient.invalidateQueries({ queryKey: ["feed"] });
          });
        }}
      />

      {/* M9 — reprocess confirmation */}
      <Dialog
        visible={reprocessOpen}
        title={t("modals.reprocessTitle")}
        description={t("modals.reprocessBody")}
        onClose={() => setReprocessOpen(false)}
      >
        <GlassSurface fallback style={{ borderRadius: radii.control, padding: 12 }}>
          <Text style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 }}>
            {t("modals.reprocessReplaced")}
          </Text>
        </GlassSurface>
        <GlassSurface fallback style={{ borderRadius: radii.control, padding: 12 }}>
          <Text style={{ color: tokens.text, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 }}>
            {t("modals.reprocessUntouched")}
          </Text>
        </GlassSurface>
        <View style={styles.draftButtons}>
          <Button variant="ghost" label={t("common.cancel")} onPress={() => setReprocessOpen(false)} />
          <Button
            variant="primary"
            label={t("item.reprocess")}
            onPress={() => {
              setReprocessOpen(false);
              void api.reprocessItem(item.id).then(() => {
                void queryClient.invalidateQueries({ queryKey: ["item", id] });
                void queryClient.invalidateQueries({ queryKey: ["feed"] });
              });
            }}
          />
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  titleEditRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerBtn: { padding: 8, margin: -4, borderRadius: 8 },
  sourceRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 4 },
  langBadge: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 4, paddingHorizontal: 3 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  hintBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 8 },
  section: { paddingVertical: 14 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, paddingVertical: 4 },
  sectionBody: { marginTop: 10 },
  linkCard: {
    flexDirection: "row",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
  },
  mediaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  mediaBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  video: { height: 220, borderRadius: 10, marginTop: 4 },
  commentBox: { borderLeftWidth: 2, paddingLeft: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8 },
  commentPlaceholder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 12,
  },
  draftInput: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  draftButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  aiBadgeBig: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  relatedRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  procRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
