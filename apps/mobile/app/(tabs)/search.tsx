import { useTranslation } from "react-i18next";
import { ScreenPlaceholder } from "../../src/components/ScreenPlaceholder";

/** S6 — replaced by the real search in Phase 5. */
export default function SearchTab() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("shell.search")} note="S6 — Phase 5" />;
}
