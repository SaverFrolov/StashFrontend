import { useTranslation } from "react-i18next";
import { ScreenPlaceholder } from "../../src/components/ScreenPlaceholder";

/** S9 — replaced by the real tags table in Phase 5. */
export default function TagsTab() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("shell.tags")} note="S9 — Phase 5" />;
}
