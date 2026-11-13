import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { getStrings } from "./i18n";
import type { ExtStrings } from "./i18n";

function Options() {
  const [s, setS] = useState<ExtStrings | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [defaultCollection, setDefaultCollection] = useState("");
  const [language, setLanguage] = useState<"ru" | "en">("ru");
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      setS(await getStrings());
      const stored = await chrome.storage.local.get(["serverUrl", "apiToken", "defaultCollection", "language"]);
      setServerUrl(stored.serverUrl ?? "");
      setApiToken(stored.apiToken ?? "");
      setDefaultCollection(stored.defaultCollection ?? "");
      setLanguage(stored.language === "en" ? "en" : "ru");
      document.documentElement.lang = stored.language === "en" ? "en" : "ru";
    })();
  }, []);

  const save = async () => {
    await chrome.storage.local.set({ serverUrl, apiToken, defaultCollection, language });
    document.documentElement.lang = language;
    setSaved(true);
    setS(await getStrings());
    setTimeout(() => setSaved(false), 2000);
  };

  const test = async () => {
    setTestState("testing");
    try {
      const res = await fetch(`${serverUrl.replace(/\/$/, "")}/health`, {
        headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined,
      });
      setTestState(res.ok ? "ok" : "fail");
    } catch {
      setTestState("fail");
    }
  };

  if (!s) return null;

  return (
    <div className="ext-section">
      <h1>{s.optionsTitle}</h1>

      <label className="ext-field">
        <span className="ext-label">{s.serverUrl}</span>
        <input
          className="ext-input"
          type="url"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="https://inbox.example.com/api"
        />
      </label>

      <label className="ext-field">
        <span className="ext-label">{s.apiToken}</span>
        <input
          className="ext-input"
          type="password"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          autoComplete="off"
        />
        <span className="ext-hint">{s.apiTokenHint}</span>
      </label>

      <label className="ext-field">
        <span className="ext-label">{s.defaultCollection}</span>
        <input
          className="ext-input"
          value={defaultCollection}
          onChange={(e) => setDefaultCollection(e.target.value)}
        />
      </label>

      <label className="ext-field">
        <span className="ext-label">{s.language}</span>
        <select
          className="ext-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value as "ru" | "en")}
        >
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select>
      </label>

      <div className="ext-row">
        <button type="button" className="ext-button" onClick={() => void test()} disabled={testState === "testing" || !serverUrl}>
          {testState === "testing" ? s.testing : s.testConnection}
        </button>
        {testState === "ok" && <span className="ext-success-text">{s.testOk}</span>}
        {testState === "fail" && <span className="ext-error">{s.testFail}</span>}
      </div>

      <div className="ext-row">
        <button type="button" className="ext-button primary" onClick={() => void save()}>
          {s.saveOptions}
        </button>
        {saved && <span className="ext-success-text">{s.saved}</span>}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Options />);
