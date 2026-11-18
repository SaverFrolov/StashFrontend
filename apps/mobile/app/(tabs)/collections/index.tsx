import { useTranslation } from "react-i18next";
import { ScreenPlaceholder } from "../../../src/components/ScreenPlaceholder";

/** S7 — replaced by the real collections list in Phase 5. */
export default function CollectionsTab() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("shell.collections")} note="S7 — Phase 5" />;
}
