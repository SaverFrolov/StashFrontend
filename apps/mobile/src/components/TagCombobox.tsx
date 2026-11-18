import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { radii } from "@inbox/ui-core";
import { fonts, useTheme } from "../theme/ThemeProvider";
import { getApiClient } from "../api";
import { Input } from "./Field";

/**
 * M4 — tag combobox: autocomplete from existing tags (name + origin),
 * submit adds the highlighted suggestion or creates a new tag from input.
 */
export function TagCombobox({
  onAdd,
  exclude = [],
}: {
  onAdd: (tagName: string) => void;
  exclude?: string[];
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const api = getApiClient();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => api.listTags() });

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    return (tags ?? [])
      .filter((tag) => !exclude.includes(tag.name))
      .filter((tag) => (q ? tag.name.toLowerCase().includes(q) : true))
      .slice(0, 6);
  }, [tags, value, exclude]);

  useEffect(() => setActiveIndex(0), [value]);

  const commit = (name: string) => {
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    setValue("");
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Input
        value={value}
        onChangeText={(v) => {
          setValue(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so a tap on a suggestion registers first
          setTimeout(() => setOpen(false), 150);
        }}
        onSubmitEditing={() => {
          if (open && suggestions[activeIndex] && value.trim()) commit(suggestions[activeIndex].name);
          else commit(value);
        }}
        returnKeyType="done"
        placeholder={`+ ${t("item.addTag")}`}
        autoCapitalize="none"
        style={styles.input}
      />
      {open && suggestions.length > 0 ? (
        <View
          style={[
            styles.dropdown,
            {
              borderRadius: radii.dialog,
              backgroundColor: tokens.surface,
              borderColor: tokens.glassBorder,
            },
          ]}
        >
          <FlatList
            data={suggestions}
            keyExtractor={(tag) => tag.id}
            scrollEnabled={false}
            renderItem={({ item: tag, index }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => commit(tag.name)}
                onHoverIn={() => setActiveIndex(index)}
                style={({ pressed }) => [
                  styles.suggestion,
                  (index === activeIndex || pressed) && { backgroundColor: tokens.accentSubtle },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    color: index === activeIndex ? tokens.accent : tokens.text,
                    fontFamily: fonts.regular,
                    fontSize: 14,
                  }}
                >
                  {tag.name}
                </Text>
                <Text style={{ color: tokens.textTertiary, fontFamily: fonts.regular, fontSize: 11 }}>
                  {tag.origin === "user" ? t("tags.originUser") : t("tags.originAi")}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 140,
    flex: 1,
    zIndex: 20,
  },
  input: {
    minHeight: 36,
    height: 36,
    fontSize: 13,
    borderStyle: "dashed",
  },
  dropdown: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    zIndex: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
