import { useTranslation } from "react-i18next";
import { ScreenPlaceholder } from "../../src/components/ScreenPlaceholder";

/** S10 — replaced by the real settings in Phase 6. */
export default function SettingsTab() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("settings.title")} note="S10 — Phase 6" />;
}
