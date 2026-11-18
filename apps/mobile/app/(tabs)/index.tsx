import { useTranslation } from "react-i18next";
import { ScreenPlaceholder } from "../../src/components/ScreenPlaceholder";

/** S4 — replaced by the real feed in Phase 4. */
export default function InboxTab() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("shell.inbox")} note="S4 — Phase 4" />;
}
