import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { CornerDownLeft, FileText, Folder, Link2, Plus, Search, Tag as TagIcon, Music, File, Sheet, Video } from "lucide-react";
import { cn } from "@inbox/ui";
import type { Item } from "@inbox/api-client";
import { useApi } from "../state/api";

interface CommandPaletteContextValue {
  openPalette: () => void;
  closePalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  return ctx;
}

interface Command {
  id: string;
  label: string;
  section: string;
  icon: ReactNode;
  run: () => void;
  keywords?: string;
}

const typeIcon = (type: Item["type"]) => {
  switch (type) {
    case "link":
      return <Link2 size={16} strokeWidth={1.5} aria-hidden />;
    case "audio":
      return <Music size={16} strokeWidth={1.5} aria-hidden />;
    case "video":
      return <Video size={16} strokeWidth={1.5} aria-hidden />;
    case "xlsx":
      return <Sheet size={16} strokeWidth={1.5} aria-hidden />;
    case "pdf":
    case "docx":
      return <File size={16} strokeWidth={1.5} aria-hidden />;
    default:
      return <FileText size={16} strokeWidth={1.5} aria-hidden />;
  }
};

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const openPalette = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }, []);
  const closePalette = useCallback(() => setOpen(false), []);
  const ctxValue = useMemo(() => ({ openPalette, closePalette }), [openPalette, closePalette]);

  const { data: items } = useQuery({
    queryKey: ["palette-items"],
    queryFn: async () => (await api.listItems({ limit: 100 })).items,
    enabled: open,
  });
  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.listCollections(),
    enabled: open,
  });
  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.listTags(),
    enabled: open,
  });

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate],
  );

  const commands = useMemo<Command[]>(() => {
    const q = query.trim().toLowerCase();
    const list: Command[] = [];

    list.push({
      id: "action-new-note",
      label: t("modals.commandActionNewNote"),
      section: t("modals.commandSectionActions"),
      icon: <Plus size={16} strokeWidth={1.5} aria-hidden />,
      run: () => {
        setOpen(false);
        navigate("/inbox");
        setTimeout(() => window.dispatchEvent(new CustomEvent("inbox:focus-composer")), 50);
      },
    });
    list.push({
      id: "action-search",
      label: t("shell.search"),
      section: t("modals.commandSectionActions"),
      icon: <Search size={16} strokeWidth={1.5} aria-hidden />,
      run: () => go("/search"),
    });

    for (const item of (items ?? []).slice(0, 30)) {
      list.push({
        id: `item-${item.id}`,
        label: item.title,
        section: t("modals.commandSectionItems"),
        icon: typeIcon(item.type),
        keywords: `${item.ai.annotation ?? ""} ${item.userComment ?? ""}`.toLowerCase(),
        run: () => go(`/items/${item.id}`),
      });
    }
    for (const c of collections ?? []) {
      list.push({
        id: `col-${c.id}`,
        label: c.name,
        section: t("modals.commandSectionCollections"),
        icon: <Folder size={16} strokeWidth={1.5} aria-hidden />,
        run: () => go(`/collections/${c.id}`),
      });
    }
    for (const tag of tags ?? []) {
      list.push({
        id: `tag-${tag.id}`,
        label: tag.name,
        section: t("modals.commandSectionTags"),
        icon: <TagIcon size={16} strokeWidth={1.5} aria-hidden />,
        run: () => go(`/tags?highlight=${encodeURIComponent(tag.name)}`),
      });
    }

    if (!q) return list.slice(0, 20);
    const filtered = list.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.keywords ?? "").includes(q),
    );
    // Top 6 results per spec (plus always-visible actions section handled by slice order)
    return filtered.slice(0, 6);
  }, [query, items, collections, tags, t, go, navigate]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, commands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commands[activeIndex]?.run();
    }
  };

  let lastSection = "";

  return (
    <CommandPaletteContext.Provider value={ctxValue}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content
            className="fixed left-1/2 top-[15vh] z-50 w-[calc(100vw-32px)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-dialog border border-glass-border bg-surface glass-rim"
            onKeyDown={onKeyDown}
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">{t("modals.commandPalettePlaceholder")}</Dialog.Title>
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search size={18} strokeWidth={1.5} className="shrink-0 text-text-tertiary" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("modals.commandPalettePlaceholder")}
                aria-label={t("modals.commandPalettePlaceholder")}
                className="h-12 w-full bg-transparent text-md text-text outline-none placeholder:text-text-tertiary"
              />
              <kbd className="hidden shrink-0 rounded border border-glass-border bg-surface-subtle px-1.5 py-0.5 font-mono text-xs text-text-tertiary sm:block">
                Esc
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2" role="listbox" aria-label={t("modals.commandPalettePlaceholder")}>
              {commands.length === 0 && (
                <p className="px-3 py-6 text-center text-base text-text-tertiary">
                  {t("modals.commandPaletteEmpty")}
                </p>
              )}
              {commands.map((cmd, i) => {
                const showSection = cmd.section !== lastSection;
                lastSection = cmd.section;
                return (
                  <div key={cmd.id}>
                    {showSection && (
                      <p className="px-3 pb-1 pt-2 text-xs font-medium text-text-tertiary">{cmd.section}</p>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === activeIndex}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={cmd.run}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-base",
                        i === activeIndex ? "bg-accent-subtle text-accent" : "text-text hover:bg-surface-subtle",
                      )}
                    >
                      <span className="shrink-0 text-text-tertiary" aria-hidden>
                        {cmd.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                      {i === activeIndex && (
                        <CornerDownLeft size={14} strokeWidth={1.5} className="shrink-0 text-text-tertiary" aria-hidden />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </CommandPaletteContext.Provider>
  );
}
