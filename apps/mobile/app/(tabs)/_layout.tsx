import { Platform, StyleSheet, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Folder, Inbox, Search, Settings, Tags } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { fonts, useTheme } from "../../src/theme/ThemeProvider";
import { useAuth } from "../../src/state/AuthContext";

/** Bottom tab bar: Inbox, Search, Collections, Tags, Settings (glass background). */
export default function TabsLayout() {
  const { t } = useTranslation();
  const { tokens, theme } = useTheme();
  const { session, ready } = useAuth();

  if (!ready) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          // Normal flow (not absolute): screens and the docked composer must
          // sit above the bar without manual height math. Glass look comes
          // from tabBarBackground below.
          backgroundColor: "transparent",
          borderTopColor: tokens.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: 56,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              tint={theme === "dark" ? "dark" : "light"}
              intensity={80}
              experimentalBlurMethod={Platform.OS === "android" ? "none" : undefined}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.surface }]} />
          </View>
        ),
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.textTertiary,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("shell.inbox"),
          tabBarIcon: ({ color, size }) => <Inbox color={color} size={size} strokeWidth={1.5} />,
          tabBarAccessibilityLabel: t("shell.inbox"),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("shell.search"),
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: t("shell.collections"),
          tabBarIcon: ({ color, size }) => <Folder color={color} size={size} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="tags"
        options={{
          title: t("shell.tags"),
          tabBarIcon: ({ color, size }) => <Tags color={color} size={size} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("common.settings"),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} strokeWidth={1.5} />,
        }}
      />
    </Tabs>
  );
}
