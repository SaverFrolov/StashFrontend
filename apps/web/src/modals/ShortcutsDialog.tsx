import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@inbox/ui";

const SHORTCUTS: Array<{ keys: string; labelKey: string }> = [
  { keys: "⌘K / Ctrl+K", labelKey: "modals.shortcutPalette" },
  { keys: "N", labelKey: "modals.shortcutNewNote" },
  { keys: "/", labelKey: "modals.shortcutSearch" },
  { keys: "G I", labelKey: "modals.shortcutInbox" },
  { keys: "Enter", labelKey: "modals.shortcutSend" },
  { keys: "Shift+Enter", labelKey: "modals.shortcutNewline" },
  { keys: "Esc", labelKey: "modals.shortcutClose" },
  { keys: "?", labelKey: "modals.shortcutHelp" },
];

/** M14: keyboard shortcuts sheet, opened with "?". */
export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t("modals.shortcutsTitle")} closeLabel={t("common.close")}>
        <dl className="flex flex-col divide-y divide-border">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-base text-text">{t(s.labelKey)}</dt>
              <dd>
                <kbd className="rounded border border-border bg-surface-subtle px-2 py-0.5 font-mono text-xs text-text-secondary">
                  {s.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
