import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";

/** S12: offline system state. */
export function OfflineScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen min-h-dvh flex-col items-center justify-center gap-3 bg-bg p-6 text-center">
      <WifiOff size={28} strokeWidth={1.5} className="text-text-tertiary" aria-hidden />
      <h1 className="text-xl font-semibold text-text">{t("system.offlineTitle")}</h1>
      <p className="max-w-sm text-base text-text-secondary">{t("system.offlineBody")}</p>
    </div>
  );
}
