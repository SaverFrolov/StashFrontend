import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "inbox-install-dismissed";

/** Dismissible inline banner suggesting app installation — never a modal. */
export function InstallBanner() {
  const { t } = useTranslation();
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!event || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-border bg-accent-subtle px-4 py-2 text-base text-text"
    >
      <Download size={16} strokeWidth={1.5} className="shrink-0 text-accent" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{t("system.installBanner")}</span>
      <button
        type="button"
        onClick={() => {
          void event.prompt();
          void event.userChoice.then(() => setEvent(null));
        }}
        className="shrink-0 rounded-control border border-accent px-3 py-1 text-sm font-medium text-accent hover:bg-surface"
      >
        {t("system.install")}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("system.dismiss")}
        className="shrink-0 rounded p-1 text-text-tertiary hover:text-text"
      >
        <X size={16} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}

export function useInstallPrompt(): {
  canInstall: boolean;
  install: () => Promise<void>;
} {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return {
    canInstall: Boolean(event),
    install: async () => {
      if (!event) return;
      await event.prompt();
      await event.userChoice;
      setEvent(null);
    },
  };
}
