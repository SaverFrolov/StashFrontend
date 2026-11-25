import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Shield, Trash2 } from "lucide-react";
import { useApi } from "../state/api";
import { useAuth } from "../state/auth";
import { useModals } from "../modals/ModalProvider";
import { formatBytes, formatDateTime } from "../lib/format";

export function AdminScreen() {
  const { t } = useTranslation();
  const api = useApi();
  const { session } = useAuth();
  const { openConfirm } = useModals();
  const queryClient = useQueryClient();

  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api.adminOverview(),
    retry: false,
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.adminDeleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });

  if (overview.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <Shield size={32} strokeWidth={1.5} className="text-text-tertiary" aria-hidden />
        <h1 className="text-lg font-semibold text-text">{t("admin.denied")}</h1>
        <p className="text-base text-text-secondary">{t("admin.deniedBody")}</p>
      </div>
    );
  }

  const data = overview.data;
  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-text">{t("admin.title")}</h1>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {(
          [
            ["admin.users", data?.totals.users],
            ["admin.items", data?.totals.items],
            ["admin.storage", data ? formatBytes(data.totals.bytesUsed) : undefined],
          ] as Array<[string, string | number | undefined]>
        ).map(([label, value]) => (
          <div key={label} className="rounded-card border border-border bg-surface p-3">
            <div className="text-xs text-text-tertiary">{t(label)}</div>
            <div className="tnum mt-1 text-lg font-semibold text-text">{value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[560px] text-base">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-xs text-text-tertiary">
              <th className="px-3 py-2 font-medium">{t("admin.name")}</th>
              <th className="px-3 py-2 font-medium">{t("admin.email")}</th>
              <th className="px-3 py-2 font-medium">{t("admin.registered")}</th>
              <th className="tnum px-3 py-2 text-right font-medium">{t("admin.itemsCol")}</th>
              <th className="tnum px-3 py-2 text-right font-medium">{t("admin.bytesCol")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(data?.users ?? []).map((u) => {
              const isSelf = u.id === session?.user.id;
              return (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-text">
                    {u.name}
                    {isSelf && <span className="ml-2 text-xs text-text-tertiary">({t("admin.self")})</span>}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{u.email}</td>
                  <td className="px-3 py-2 text-text-secondary">{formatDateTime(u.createdAt)}</td>
                  <td className="tnum px-3 py-2 text-right text-text">{u.items}</td>
                  <td className="tnum px-3 py-2 text-right text-text-secondary">{formatBytes(u.bytesUsed)}</td>
                  <td className="px-3 py-2 text-right">
                    {!isSelf && (
                      <button
                        type="button"
                        aria-label={t("admin.delete")}
                        title={t("admin.delete")}
                        className="rounded p-1.5 text-text-tertiary hover:bg-surface-subtle hover:text-danger"
                        onClick={() =>
                          openConfirm({
                            title: t("admin.deleteTitle"),
                            body: t("admin.deleteBody", { email: u.email }),
                            confirmLabel: t("admin.deleteConfirm"),
                            danger: true,
                            onConfirm: () => deleteUser.mutateAsync(u.id),
                          })
                        }
                      >
                        <Trash2 size={16} strokeWidth={1.5} aria-hidden />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {data && data.users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-text-tertiary">
                  {t("admin.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
