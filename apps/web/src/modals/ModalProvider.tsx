import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Collection, Item } from "@inbox/api-client";
import { UploadDialog } from "./UploadDialog";
import { AddToCollectionDialog } from "./AddToCollectionDialog";
import { CollectionFormDialog } from "./CollectionFormDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { ExportDialog } from "./ExportDialog";
import { ProcessingDrawer } from "./ProcessingDrawer";
import { ReprocessDialog } from "./ReprocessDialog";
import { MicPermissionDialog } from "./MicPermissionDialog";
import { SessionExpiredDialog } from "./SessionExpiredDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  /** when set, the user must type this exact string to enable confirm (account deletion) */
  requireText?: string;
  requireTextLabel?: string;
  onConfirm: () => Promise<void> | void;
}

interface ModalContextValue {
  openUpload: (opts?: { presetComment?: string; presetFiles?: File[] }) => void;
  openAddToCollection: (itemIds: string[]) => void;
  openCollectionForm: (collection?: Collection) => void;
  openConfirm: (opts: ConfirmOptions) => void;
  openExport: (opts?: { scope?: "all" | "collection" | "selected"; collectionId?: string; itemIds?: string[] }) => void;
  openProcessing: (item: Item) => void;
  openReprocess: (item: Item) => void;
  openMicPermission: (reason: "denied" | "unsupported") => void;
  openShortcuts: () => void;
  openSessionExpired: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModals(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModals must be used within ModalProvider");
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [upload, setUpload] = useState<{ open: boolean; presetComment?: string; presetFiles?: File[] }>({ open: false });
  const [addCollection, setAddCollection] = useState<{ open: boolean; itemIds: string[] }>({ open: false, itemIds: [] });
  const [collectionForm, setCollectionForm] = useState<{ open: boolean; collection?: Collection }>({ open: false });
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [exportOpts, setExportOpts] = useState<{ open: boolean; scope?: "all" | "collection" | "selected"; collectionId?: string; itemIds?: string[] }>({ open: false });
  const [processing, setProcessing] = useState<{ open: boolean; item?: Item }>({ open: false });
  const [reprocess, setReprocess] = useState<{ open: boolean; item?: Item }>({ open: false });
  const [micPermission, setMicPermission] = useState<{ open: boolean; reason?: "denied" | "unsupported" }>({ open: false });
  const [shortcuts, setShortcuts] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const value = useMemo<ModalContextValue>(
    () => ({
      openUpload: (opts) => setUpload({ open: true, ...opts }),
      openAddToCollection: (itemIds) => setAddCollection({ open: true, itemIds }),
      openCollectionForm: (collection) => setCollectionForm({ open: true, collection }),
      openConfirm: (opts) => setConfirm(opts),
      openExport: (opts) => setExportOpts({ open: true, ...opts }),
      openProcessing: (item) => setProcessing({ open: true, item }),
      openReprocess: (item) => setReprocess({ open: true, item }),
      openMicPermission: (reason) => setMicPermission({ open: true, reason }),
      openShortcuts: () => setShortcuts(true),
      openSessionExpired: () => setSessionExpired(true),
    }),
    [],
  );

  const closeConfirm = useCallback(() => setConfirm(null), []);

  return (
    <ModalContext.Provider value={value}>
      {children}
      <UploadDialog
        open={upload.open}
        presetComment={upload.presetComment}
        presetFiles={upload.presetFiles}
        onClose={() => setUpload({ open: false })}
      />
      <AddToCollectionDialog
        open={addCollection.open}
        itemIds={addCollection.itemIds}
        onClose={() => setAddCollection({ open: false, itemIds: [] })}
      />
      <CollectionFormDialog
        open={collectionForm.open}
        collection={collectionForm.collection}
        onClose={() => setCollectionForm({ open: false })}
      />
      <ConfirmDialog options={confirm} onClose={closeConfirm} />
      <ExportDialog
        open={exportOpts.open}
        scope={exportOpts.scope}
        collectionId={exportOpts.collectionId}
        itemIds={exportOpts.itemIds}
        onClose={() => setExportOpts({ open: false })}
      />
      <ProcessingDrawer
        open={processing.open}
        item={processing.item}
        onClose={() => setProcessing({ open: false })}
      />
      <ReprocessDialog
        open={reprocess.open}
        item={reprocess.item}
        onClose={() => setReprocess({ open: false })}
      />
      <MicPermissionDialog
        open={micPermission.open}
        reason={micPermission.reason}
        onClose={() => setMicPermission({ open: false })}
      />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
      <SessionExpiredDialog open={sessionExpired} onClose={() => setSessionExpired(false)} />
    </ModalContext.Provider>
  );
}
