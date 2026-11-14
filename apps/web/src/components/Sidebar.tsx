import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  FolderPlus,
  Inbox as InboxIcon,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Tag as TagIcon,
  Folder,
  LogOut,
} from "lucide-react";
import { Avatar, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, cn } from "@inbox/ui";
import { APP_NAME } from "@inbox/api-client";
import { useApi } from "../state/api";
import { useAuth } from "../state/auth";
import { useSettings } from "../state/settings";
import type { ThemeMode } from "../state/settings";
import { useModals } from "../modals/ModalProvider";

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  collapseLabel,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  collapseLabel?: string;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { theme, setTheme, language, setLanguage } = useSettings();
  const { openCollectionForm } = useModals();

  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.listCollections(),
  });
  const { data: counts } = useQuery({
    queryKey: ["collection-counts"],
    queryFn: async () => {
      const [cols, page] = await Promise.all([
        api.listCollections(),
        api.listItems({ limit: 1000 }),
      ]);
      const map: Record<string, number> = {};
      for (const c of cols) map[c.id] = 0;
      for (const item of page.items) {
        for (const cid of item.collectionIds) {
          map[cid] = (map[cid] ?? 0) + 1;
        }
      }
      return map;
    },
  });
  const { data: attention } = useQuery({
    queryKey: ["attention-count"],
    queryFn: () => api.attentionCount(),
    refetchInterval: 5000,
  });

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const userName = session?.user.name ?? "";
  const initialsName = useMemo(() => userName || "U", [userName]);

  const navItem = (to: string, icon: React.ReactNode, label: string, badge?: number) => (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex h-9 max-sm:h-11 items-center gap-3 rounded-control px-3 text-base font-medium transition-colors duration-150 ease-out",
          isActive ? "bg-accent-subtle text-accent" : "text-text-secondary hover:bg-surface-subtle hover:text-text",
          collapsed && "lg:justify-center lg:px-0",
        )
      }
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="ml-auto tnum text-xs text-text-tertiary" aria-label={t("shell.attentionCount", { count: badge })}>
          {badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Wordmark — hidden entirely in the collapsed rail */}
      <div className={cn("flex h-14 items-center border-b border-border px-4", collapsed && "lg:justify-center lg:px-0")}>
        {!collapsed && (
          <span className="text-md font-semibold tracking-tight text-text" title={APP_NAME}>
            {APP_NAME}
          </span>
        )}
        {onToggleCollapse && collapseLabel && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapseLabel}
            title={collapseLabel}
            className="ml-auto hidden rounded-control p-1.5 text-text-tertiary hover:bg-surface-subtle lg:block"
          >
            <Monitor size={16} strokeWidth={1.5} aria-hidden />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2" aria-label={t("shell.inbox")}>
        <div className="flex flex-col gap-0.5">
          {navItem("/inbox", <InboxIcon size={20} strokeWidth={1.5} />, t("shell.inbox"))}
          {navItem("/search", <Search size={20} strokeWidth={1.5} />, t("shell.search"))}
        </div>

        {/* Collections section — plays the role of the chat-history list */}
        <div className="mt-4">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs font-medium text-text-tertiary">{t("shell.collections")}</span>
              <button
                type="button"
                aria-label={t("shell.addCollection")}
                title={t("shell.addCollection")}
                onClick={() => openCollectionForm()}
                className="rounded p-1 text-text-tertiary hover:bg-surface-subtle hover:text-text"
              >
                <Plus size={14} strokeWidth={1.5} aria-hidden />
              </button>
            </div>
          )}
          {collapsed && (
            <button
              type="button"
              aria-label={t("shell.addCollection")}
              onClick={() => openCollectionForm()}
              className="mb-1 flex h-9 w-full items-center justify-center rounded-control text-text-tertiary hover:bg-surface-subtle hover:text-text lg:h-9"
            >
              <FolderPlus size={20} strokeWidth={1.5} aria-hidden />
            </button>
          )}
          <div className="flex flex-col gap-0.5">
            {(collections ?? []).map((c) => (
              <NavLink
                key={c.id}
                to={`/collections/${c.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex h-9 max-sm:h-11 items-center gap-3 rounded-control px-3 text-base transition-colors duration-150 ease-out",
                    isActive ? "bg-accent-subtle text-accent" : "text-text-secondary hover:bg-surface-subtle hover:text-text",
                    collapsed && "lg:justify-center lg:px-0",
                  )
                }
                title={collapsed ? c.name : undefined}
              >
                <Folder size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
                {!collapsed && <span className="min-w-0 flex-1 truncate">{c.name}</span>}
                {!collapsed && (
                  <span className="tnum shrink-0 text-xs text-text-tertiary">{counts?.[c.id] ?? 0}</span>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-0.5">
          {navItem("/tags", <TagIcon size={20} strokeWidth={1.5} />, t("shell.tags"))}
          <button
            type="button"
            onClick={() => {
              navigate("/inbox?filter=attention");
              onNavigate?.();
            }}
            className={cn(
              "flex h-9 max-sm:h-11 items-center gap-3 rounded-control px-3 text-base font-medium text-text-secondary transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-text",
              collapsed && "lg:justify-center lg:px-0",
            )}
            title={collapsed ? t("feed.filterAttention") : undefined}
          >
            <AlertCircle size={20} strokeWidth={1.5} className="shrink-0" aria-hidden />
            {!collapsed && (
              <>
                <span className="truncate">{t("feed.filterAttention")}</span>
                {attention && attention.count > 0 && (
                  <span className="tnum ml-auto text-xs text-warning">{attention.count}</span>
                )}
              </>
            )}
          </button>
        </div>
      </nav>

      {/* User menu */}
      <div className="border-t border-border p-2">
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label={t("shell.userMenu")}
              className={cn(
                "flex w-full items-center gap-3 rounded-control px-2 py-2 text-left hover:bg-surface-subtle",
                collapsed && "lg:justify-center lg:px-0",
              )}
            >
              <Avatar name={initialsName} size={28} />
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium text-text">{userName}</span>
                  <span className="block truncate text-xs text-text-tertiary">{session?.user.email}</span>
                </span>
              )}
            </button>
          </MenuTrigger>
          <MenuContent className="min-w-[220px]">
            <MenuItem
              icon={<Settings size={16} strokeWidth={1.5} aria-hidden />}
              onSelect={() => {
                navigate("/settings");
                onNavigate?.();
              }}
            >
              {t("common.settings")}
            </MenuItem>

            <Menu open={langMenuOpen} onOpenChange={setLangMenuOpen}>
              <MenuLabel>{t("common.language")}</MenuLabel>
              <div className="flex gap-1 px-2 pb-1">
                {(["ru", "en"] as const).map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    onClick={() => {
                      setLanguage(lng);
                      setLangMenuOpen(false);
                    }}
                    className={cn(
                      "h-7 flex-1 rounded-control border text-sm",
                      language === lng
                        ? "border-accent bg-accent-subtle text-accent"
                        : "border-border text-text-secondary hover:bg-surface-subtle",
                    )}
                  >
                    {lng === "ru" ? "Русский" : "English"}
                  </button>
                ))}
              </div>
            </Menu>

            <Menu open={themeMenuOpen} onOpenChange={setThemeMenuOpen}>
              <MenuLabel>{t("common.theme")}</MenuLabel>
              <div className="flex gap-1 px-2 pb-1">
                {(
                  [
                    ["system", <Monitor key="s" size={14} strokeWidth={1.5} aria-hidden />],
                    ["light", <Sun key="l" size={14} strokeWidth={1.5} aria-hidden />],
                    ["dark", <Moon key="d" size={14} strokeWidth={1.5} aria-hidden />],
                  ] as Array<[ThemeMode, React.ReactNode]>
                ).map(([mode, icon]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-label={t(`shell.theme${mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"}`)}
                    onClick={() => {
                      setTheme(mode);
                      setThemeMenuOpen(false);
                    }}
                    className={cn(
                      "flex h-7 flex-1 items-center justify-center rounded-control border",
                      theme === mode
                        ? "border-accent bg-accent-subtle text-accent"
                        : "border-border text-text-secondary hover:bg-surface-subtle",
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </Menu>

            <MenuSeparator />
            <MenuItem
              icon={<LogOut size={16} strokeWidth={1.5} aria-hidden />}
              onSelect={() => {
                void signOut();
                navigate("/login");
              }}
            >
              {t("common.signOut")}
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </div>
  );
}
