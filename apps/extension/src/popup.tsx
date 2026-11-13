import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { getStrings } from "./i18n";
import type { ExtStrings } from "./i18n";

interface PopupState {
  serverUrl?: string;
  apiToken?: string;
  defaultCollection?: string;
}

type Phase = "signed-out" | "ready" | "saving" | "saved" | "error";

function Popup() {
  const [s, setS] = useState<ExtStrings | null>(null);
  const [settings, setSettings] = useState<PopupState>({});
  const [phase, setPhase] = useState<Phase>("signed-out");
  const [pageTitle, setPageTitle] = useState("");
  const [pageDomain, setPageDomain] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [selection, setSelection] = useState("");
  const [saveSelection, setSaveSelection] = useState(false);
  const [comment, setComment] = useState("");
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [collectionId, setCollectionId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const strings = await getStrings();
      setS(strings);
      document.documentElement.lang = (await chrome.storage.local.get(["language"])).language === "en" ? "en" : "ru";

      const stored = await chrome.storage.local.get(["serverUrl", "apiToken", "defaultCollection"]);
      setSettings(stored);
      if (stored.defaultCollection) setCollectionId(stored.defaultCollection);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        setPageTitle(tab.title ?? "");
        setPageUrl(tab.url ?? "");
        try {
          setPageDomain(new URL(tab.url ?? "").hostname.replace(/^www\./, ""));
        } catch {
          setPageDomain("");
        }
      }

      const sel = await chrome.scripting
        .executeScript({ target: { tabId: tab!.id! }, func: () => window.getSelection()?.toString() ?? "" })
        .then((r) => (r?.[0]?.result as string) ?? "")
        .catch(() => "");
      setSelection(sel);
      setSaveSelection(sel.trim().length > 0);

      if (stored.serverUrl && stored.apiToken) {
        setPhase("ready");
        try {
          const res = await fetch(`${stored.serverUrl.replace(/\/$/, "")}/collections`, {
            headers: { Authorization: `Bearer ${stored.apiToken}` },
          });
          if (res.ok) setCollections((await res.json()) as Array<{ id: string; name: string }>);
        } catch {
          /* collections are optional */
        }
      }
    })();
  }, []);

  const doSave = async () => {
    if (!s) return;
    setPhase("saving");
    setErrorMessage("");
    try {
      const url = settings.serverUrl!.replace(/\/$/, "");
      const payload =
        saveSelection && selection.trim()
          ? { text: selection.trim(), comment: [pageUrl, comment].filter(Boolean).join(" ") }
          : { url: pageUrl, comment: comment || undefined, collectionIds: collectionId ? [collectionId] : undefined };
      const endpoint = saveSelection && selection.trim() ? "text" : "link";
      const res = await fetch(`${url}/items/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.apiToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`http-${res.status}`);
      setPhase("saved");
      setTimeout(() => window.close(), 2500);
    } catch {
      setErrorMessage(s.serverUnreachable);
      setPhase("error");
    }
  };

  if (!s) return null;

  if (phase === "signed-out") {
    return (
      <div className="ext-root">
        <p className="ext-hint">{s.signedOutHint}</p>
        <button
          type="button"
          className="ext-button primary full"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          {s.signIn}
        </button>
      </div>
    );
  }

  if (phase === "saved") {
    return (
      <div className="ext-saved">
        <p className="ext-title">{s.savedTitle}</p>
        <a
          className="ext-link"
          href={`${settings.serverUrl ?? ""}/inbox`}
          target="_blank"
          rel="noreferrer"
        >
          {s.openInApp}
        </a>
      </div>
    );
  }

  return (
    <div className="ext-root">
      <div>
        <p className="ext-title">{pageTitle}</p>
        <p className="ext-domain">{pageDomain}</p>
      </div>

      {selection.trim() && (
        <>
          <div className="ext-selection-preview">{selection.slice(0, 200)}</div>
          <label className="ext-checkbox-row">
            <input
              type="checkbox"
              checked={saveSelection}
              onChange={(e) => setSaveSelection(e.target.checked)}
            />
            {s.saveSelection}
          </label>
        </>
      )}

      <textarea
        className="ext-textarea"
        placeholder={s.commentPlaceholder}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        aria-label={s.commentPlaceholder}
      />

      <label className="ext-field">
        <span className="ext-label">{s.collection}</span>
        <select
          className="ext-select"
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
        >
          <option value="">{s.noCollection}</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {phase === "error" && (
        <p className="ext-error" role="alert">
          {errorMessage || s.errorTitle}
        </p>
      )}

      <button
        type="button"
        className="ext-button primary full"
        disabled={phase === "saving" || !pageUrl}
        onClick={() => void doSave()}
      >
        {phase === "saving" ? s.saving : phase === "error" ? s.retry : s.save}
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
