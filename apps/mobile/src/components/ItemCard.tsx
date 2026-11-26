import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Check,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Link2,
  MoreHorizontal,
  Music,
  Sheet,
  Video,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Item, ItemType } from "@inbox/api-client";
import { radii, statusLabelKey } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { StatusChip } from "./StatusChip";
import { TagChip } from "./Chip";
import { ActionMenu } from "./ActionMenu";
import type { ActionMenuItem } from "./ActionMenu";
import { domainOf, formatRelative } from "../lib/format";

export const typeIcons: Record<ItemType, LucideIcon> = {
  link: Link2,
  text: FileText,
  pdf: FileIcon,
  docx: FileIcon,
  audio: Music,
  video: Video,
  xlsx: Sheet,
  image: ImageIcon,
};

export interface ItemCardProps {
  item: Item;
  onPress: (item: Item) => void;
  onLongPress: (item: Item) => void;
  selectionMode?: boolean;
  selected?: boolean;
  menuItems?: (item: Item) => ActionMenuItem[];
}

function sourceLabel(item: Item): string {
  if (item.source.name) return item.source.name;
  if (item.source.url) return domainOf(item.source.url);
  if (item.original.file) return item.original.file.name;
  return "";
}

/**
 * Feed card (web ItemCard parity, rows 1-5). No blur per the migration plan:
 * translucent green-tinted fill + green hairline, radius 14, spaced apart.
 */
export const ItemCard = memo(function ItemCard({
  item,
  onPress,
  onLongPress,
  selectionMode,
  selected,
  menuItems,
}: ItemCardProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const TypeIcon = typeIcons[item.type] ?? FileText;
  const showStatus = item.status !== "done";

  const allTags = [
    ...item.userTags.map((tag) => ({ name: tag, suggested: false })),
    ...item.suggestedTags.filter((s) => !item.userTags.includes(s)).map((tag) => ({ name: tag, suggested: true })),
  ];
  const visibleTags = allTags.slice(0, 3);
  const extraTags = allTags.length - visibleTags.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => (selectionMode ? undefined : onPress(item))}
      onLongPress={() => onLongPress(item)}
      style={({ pressed }) => [
        styles.card,
        {
          borderRadius: radii.card,
          backgroundColor: selected ? tokens.accentSubtle : tokens.surface,
          borderColor: selected ? tokens.accent : tokens.glassBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Row 1: type icon, source, ·, relative time, lang badge, status, menu */}
      <View style={styles.row1}>
        {selectionMode ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: Boolean(selected) }}
            accessibilityLabel={`${t("feed.selectMode")}: ${item.title}`}
            onPress={() => onPress(item)}
            hitSlop={6}
            style={[
              styles.checkbox,
              {
                borderColor: selected ? tokens.accent : tokens.borderStrong,
                backgroundColor: selected ? tokens.accent : "transparent",
              },
            ]}
          >
            {selected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
          </Pressable>
        ) : null}
        <TypeIcon size={15} color={tokens.textSecondary} strokeWidth={1.5} />
        <Text
          numberOfLines={1}
          style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, flexShrink: 1 }}
        >
          {sourceLabel(item)}
        </Text>
        <Text style={{ color: tokens.textTertiary, fontSize: 12 }}>·</Text>
        <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] }}>
          {formatRelative(item.capturedAt)}
        </Text>
        {item.lang ? (
          <View style={[styles.langBadge, { borderColor: tokens.border }]}>
            <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 9, textTransform: "uppercase" }}>
              {item.lang}
            </Text>
          </View>
        ) : null}
        <View style={styles.spacer} />
        {showStatus ? <StatusChip status={item.status} label={t(statusLabelKey(item.status))} size={12} /> : null}
        {menuItems && !selectionMode ? (
          <ActionMenu
            items={menuItems(item)}
            trigger={(open) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("item.reprocess")}
                onPress={open}
                hitSlop={6}
                style={({ pressed }) => [styles.dots, { opacity: pressed ? 0.6 : 1 }]}
              >
                <MoreHorizontal size={16} color={tokens.textSecondary} strokeWidth={1.5} />
              </Pressable>
            )}
          />
        ) : null}
      </View>

      {/* Row 2: title */}
      <Text
        numberOfLines={2}
        style={{ color: tokens.text, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, marginTop: 4 }}
      >
        {item.title}
      </Text>

      {/* Row 3: AI annotation */}
      {item.ai.annotation ? (
        <View style={styles.aiRow}>
          <View style={[styles.aiBadge, { borderColor: tokens.border }]}>
            <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 9 }}>{t("item.aiLabel")}</Text>
          </View>
          <Text numberOfLines={2} style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, flexShrink: 1 }}>
            {item.ai.annotation}
          </Text>
        </View>
      ) : null}

      {/* Row 4: user comment with accent left rule */}
      {item.userComment ? (
        <View style={{ borderLeftWidth: 2, borderLeftColor: tokens.accent, paddingLeft: 8, marginTop: 4 }}>
          <Text numberOfLines={2} style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
            {item.userComment}
          </Text>
        </View>
      ) : null}

      {/* Row 5: tags, max 3 + "+N"; AI suggestions dashed */}
      {visibleTags.length > 0 || extraTags > 0 ? (
        <View style={styles.tagsRow}>
          {visibleTags.map((tag) => (
            <TagChip key={`${tag.name}-${tag.suggested}`} label={tag.name} suggested={tag.suggested} />
          ))}
          {extraTags > 0 ? (
            <View style={[styles.plusN, { borderColor: tokens.borderStrong, borderRadius: radii.control }]}>
              <Text style={{ color: tokens.textSecondary, fontFamily: fonts.regular, fontSize: 11, fontVariant: ["tabular-nums"] }}>
                +{extraTags}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  row1: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  spacer: {
    flex: 1,
  },
  langBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 0,
  },
  aiRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  aiBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 3,
    marginTop: 3,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  plusN: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    padding: 4,
    margin: -4,
  },
});
