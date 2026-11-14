import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@inbox/ui";

/** S12: 404. */
export function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-6 text-center">
      <p className="tnum text-2xl font-semibold text-text-tertiary">404</p>
      <h1 className="text-xl font-semibold text-text">{t("system.notFoundTitle")}</h1>
      <p className="max-w-sm text-base text-text-secondary">{t("system.notFoundBody")}</p>
      <Link to="/inbox">
        <Button variant="primary">{t("system.goInbox")}</Button>
      </Link>
    </div>
  );
}
