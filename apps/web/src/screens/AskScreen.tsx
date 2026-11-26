import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import type { AskResponse } from "@inbox/api-client";
import { useApi } from "../state/api";
import "../ask/ask.css";

const L = {
  ru: {
    title: "Спроси архив",
    sub: "Ответ строится только по твоим материалам — с указанием источника.",
    ph: "Что я сохранял про кефирное тесто?",
    send: "Спросить",
    thinking: "Собираю фрагменты…",
    sources: "Источники",
    none: "В архиве нет материалов, релевантных этому вопросу.",
    retry: "Повторить",
    ideas: "Например",
    samples: ["Что я читал про внимание и клиповое мышление?", "Как готовить тесто на кефире?", "Что у меня есть про асинхронность?"],
  },
  en: {
    title: "Ask your archive",
    sub: "Answers are grounded in your own materials, with sources.",
    ph: "What did I save about sourdough?",
    send: "Ask",
    thinking: "Gathering fragments…",
    sources: "Sources",
    none: "Nothing in your archive matches this question.",
    retry: "Retry",
    ideas: "Try",
    samples: ["What did I read about attention span?", "How do I make kefir dough?", "What do I have on async programming?"],
  },
};

export function AskScreen() {
  const api = useApi();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const t = String(i18n.language || "ru").toLowerCase().startsWith("en") ? L.en : L.ru;

  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AskResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { input.current?.focus(); }, []);

  const run = async (text: string) => {
    const query = text.trim();
    if (!query || busy) return;
    setQ(query); setBusy(true); setErr(null); setRes(null);
    try {
      setRes(await api.ask(query));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const parts = res ? res.answer.split(/(\[\d{1,2}\])/g) : [];

  return (
    <div className="ask-page">
      <header className="ask-head">
        <span className="ask-badge"><Sparkles size={18} strokeWidth={1.6} /></span>
        <div>
          <h1>{t.title}</h1>
          <p>{t.sub}</p>
        </div>
      </header>

      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); void run(q); }}>
        <textarea
          ref={input}
          rows={2}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void run(q); }
          }}
          placeholder={t.ph}
          disabled={busy}
          spellCheck={false}
        />
        <button type="submit" disabled={busy || !q.trim()}>{busy ? t.thinking : t.send}</button>
      </form>

      {!res && !busy && !err && (
        <div className="ask-ideas">
          <span>{t.ideas}</span>
          {t.samples.map((s) => (
            <button key={s} type="button" onClick={() => void run(s)}>{s}</button>
          ))}
        </div>
      )}

      {busy && (
        <div className="ask-skeleton" aria-live="polite" aria-busy="true">
          <i /><i /><i />
        </div>
      )}

      {err && (
        <div className="ask-error" role="alert">
          <span>{err}</span>
          <button type="button" onClick={() => void run(q)}>{t.retry}</button>
        </div>
      )}

      {res && (
        <section className="ask-out">
          {res.answer
            ? <p className="ask-answer">{parts.map((p, i) => {
                const m = /^\[(\d{1,2})\]$/.exec(p);
                if (!m) return <span key={i}>{p}</span>;
                const src = res.sources.find((s) => s.n === Number(m[1]));
                return src
                  ? <button key={i} type="button" className="ask-cite"
                      onClick={() => navigate(`/items/${src.itemId}`)}>[{m[1]}]</button>
                  : <span key={i}>{p}</span>;
              })}</p>
            : <p className="ask-none">{t.none}</p>}

          {res.sources.length > 0 && (
            <aside className="ask-srcs">
              <h2>{t.sources}</h2>
              <ul>
                {res.sources.map((s) => (
                  <li key={s.n}>
                    <span className="ask-n">{s.n}</span>
                    <button type="button" onClick={() => navigate(`/items/${s.itemId}`)}>
                      <strong>{s.title || "—"}</strong>
                      <em>{s.type}</em>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </section>
      )}
    </div>
  );
}

export default AskScreen;
