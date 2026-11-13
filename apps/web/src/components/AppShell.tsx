import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";
import { IconButton, cn } from "@inbox/ui";
import { APP_NAME } from "@inbox/api-client";
import { useTranslation } from "react-i18next";
import { Sidebar } from "./Sidebar";
import { useCommandPalette } from "./CommandPalette";
import { useModals } from "../modals/ModalProvider";
import { InstallBanner } from "./InstallBanner";
import { useAuth } from "../state/auth";

export function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const { openPalette } = useCommandPalette();
  const { openShortcuts } = useModals();
  const { session } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      } else if (e.key === "?" && !isTypingTarget(e.target)) {
        e.preventDefault();
        openShortcuts();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openPalette, openShortcuts]);

  const sidebarWidth = useMemo(() => (collapsed ? "lg:w-16" : "lg:w-[264px]"), [collapsed]);

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-surface transition-[width] duration-150 ease-out lg:flex lg:flex-col",
          sidebarWidth,
        )}
        aria-label={t("shell.inbox")}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          collapseLabel={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("shell.openMenu")}>
          <button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[264px] max-w-[85vw] flex-col border-r border-border bg-surface">
            <Sidebar collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-3 lg:hidden">
          <IconButton label={t("shell.openMenu")} onClick={() => setDrawerOpen(true)}>
            <MenuIcon size={20} strokeWidth={1.5} aria-hidden />
          </IconButton>
          <span className="text-md font-semibold text-text">{APP_NAME}</span>
          <div className="flex-1" />
          <IconButton label={t("common.search")} onClick={openPalette}>
            <Search size={20} strokeWidth={1.5} aria-hidden />
          </IconButton>
        </header>

        {/* Desktop top bar */}
        <header className="sticky top-0 z-30 hidden h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:flex">
          <IconButton
            label={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <PanelLeftOpen size={20} strokeWidth={1.5} aria-hidden />
            ) : (
              <PanelLeftClose size={20} strokeWidth={1.5} aria-hidden />
            )}
          </IconButton>
          <span className="text-md font-semibold text-text">{APP_NAME}</span>
          <button
            type="button"
            onClick={openPalette}
            className="ml-2 flex h-9 min-w-0 max-w-md flex-1 items-center gap-2 rounded-control border border-border bg-surface-subtle px-3 text-base text-text-tertiary hover:border-border-strong"
          >
            <Search size={16} strokeWidth={1.5} aria-hidden />
            <span className="truncate">{t("modals.commandPalettePlaceholder")}</span>
            <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-text-tertiary xl:block">
              ⌘K
            </kbd>
          </button>
          <div className="flex-1" />
          {session && (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("inbox:focus-composer"));
              }}
              className="hidden h-9 items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-base font-medium text-text hover:bg-surface-subtle xl:inline-flex"
            >
              <Plus size={16} strokeWidth={1.5} aria-hidden />
              {t("shell.newNote")}
            </button>
          )}
        </header>

        <InstallBanner />

        <main id="main" className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}
