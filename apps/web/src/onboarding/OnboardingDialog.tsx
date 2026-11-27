import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { SLIDES, UI, type Lang } from "./copy";
import { ArtAI, ArtCapture, ArtExport, ArtSearch } from "./arts";
import "./onboarding.css";

const BASE_KEY = "stash.onboarding.v1";
const SESSION_KEY = "stash-session";

function accountKey(): string {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return `${BASE_KEY}:anon`;
    const s = JSON.parse(raw) as Record<string, any>;
    const id =
      s?.user?.id ?? s?.userId ?? s?.user?.email ??
      (typeof s?.token === "string" ? s.token.slice(-24) : null);
    return `${BASE_KEY}:${id ?? "anon"}`;
  } catch {
    return `${BASE_KEY}:anon`;
  }
}

function migrateLegacy(): void {
  try {
    if (localStorage.getItem(BASE_KEY) === "1") {
      const k = accountKey();
      if (localStorage.getItem(k) === null) localStorage.setItem(k, "1");
      localStorage.removeItem(BASE_KEY);
    }
  } catch { /* приватный режим */ }
}
const ARTS = [ArtCapture, ArtAI, ArtSearch, ArtExport];

export function OnboardingDialog() {
  const { i18n } = useTranslation();
  const lang: Lang = (i18n?.language || "ru").toLowerCase().startsWith("en") ? "en" : "ru";
  const slides = SLIDES[lang];
  const ui = UI[lang];

  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0);
  const idxRef = useRef(0);
  const keyRef = useRef(accountKey());

  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const close = useCallback(() => {
    try { localStorage.setItem(keyRef.current, "1"); } catch { /* приватный режим */ }
    setOpen(false);
  }, []);

  useEffect(() => {
    migrateLegacy();
    const evaluate = () => {
      const k = accountKey();
      if (k !== keyRef.current) {
        keyRef.current = k;
        idxRef.current = 0;
        setIdx(0);
        setOpen(false);
      }
      let seen = false;
      try { seen = localStorage.getItem(k) === "1"; } catch { seen = true; }
      if (!seen) setOpen(true);
    };
    evaluate();
    window.addEventListener("stash:session", evaluate);
    window.addEventListener("focus", evaluate);
    return () => {
      window.removeEventListener("stash:session", evaluate);
      window.removeEventListener("focus", evaluate);
    };
  }, []);

  useEffect(() => {
    const hot = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        setIdx(0);
        idxRef.current = 0;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", hot);
    return () => window.removeEventListener("keydown", hot);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    try { localStorage.setItem(keyRef.current, "1"); } catch { /* ignore */ }
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      restoreRef.current?.focus?.();
    };
  }, [open]);

  const go = useCallback(
    (n: number) => {
      const el = trackRef.current;
      const next = Math.max(0, Math.min(slides.length - 1, n));
      idxRef.current = next;
      setIdx(next);
      if (!el) return;
      el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [reduced, slides.length],
  );

  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = trackRef.current;
      if (!el || !el.clientWidth) return;
      const n = Math.round(el.scrollLeft / el.clientWidth);
      if (n !== idxRef.current) {
        idxRef.current = n;
        setIdx(n);
      }
    });
  }, []);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  useEffect(() => {
    if (!open) return;
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      el.scrollTo({ left: idxRef.current * el.clientWidth, behavior: "auto" });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); go(idxRef.current + 1); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(idxRef.current - 1); return; }
      if (e.key === "Home") { e.preventDefault(); go(0); return; }
      if (e.key === "End") { e.preventDefault(); go(slides.length - 1); return; }
      if (e.key === "Tab") {
        const root = panelRef.current;
        if (!root) return;
        const items = Array.from(
          root.querySelectorAll<HTMLElement>('button,[href],[tabindex]:not([tabindex="-1"])'),
        ).filter((n) => !n.hasAttribute("disabled") && n.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, go, slides.length]);

  const onPointer = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (reduced || e.pointerType === "touch") return;
      const el = panelRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    },
    [reduced],
  );

  if (!open || typeof document === "undefined") return null;

  const active = slides[idx];
  const last = idx === slides.length - 1;

  return createPortal(
    <div
      className="ob-scrim"
      style={{ ["--ob-a" as string]: active.accent, ["--ob-b" as string]: active.accent2 }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="ob-aurora" aria-hidden="true" />
      <div className="ob-grain" aria-hidden="true" />
      <div
        className="ob-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ob-title"
        tabIndex={-1}
        onPointerMove={onPointer}
      >
        <header className="ob-top">
          <div className="ob-brand">
            <span className="ob-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M4 7l8-4 8 4-8 4-8-4z" fill="var(--ob-a)" />
                <path d="M4 12l8 4 8-4M4 17l8 4 8-4" stroke="var(--ob-b)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            </span>
            <strong>Stash</strong>
            <span className="ob-tour">{ui.tour}</span>
          </div>
          <button type="button" className="ob-skip" onClick={close}>{ui.skip}</button>
        </header>

        <div className="ob-track" ref={trackRef} onScroll={onScroll}>
          {slides.map((s, i) => {
            const Art = ARTS[i];
            return (
              <article
                className="ob-slide"
                key={s.id}
                aria-hidden={i !== idx}
                style={{ ["--ob-a" as string]: s.accent, ["--ob-b" as string]: s.accent2 }}
              >
                <div className="ob-art"><Art /></div>
                <div className="ob-copy">
                  <span className="ob-kicker">
                    <i className="ob-dot" />{s.kicker}
                    <em>{String(i + 1).padStart(2, "0")} {ui.of} {String(slides.length).padStart(2, "0")}</em>
                  </span>
                  <h2 id={i === idx ? "ob-title" : undefined}>{s.title}</h2>
                  <p>{s.body}</p>
                  <ul className="ob-chips">
                    {s.chips.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>

        <footer className="ob-bottom">
          <button
            type="button" className="ob-nav" onClick={() => go(idx - 1)} disabled={idx === 0}
            aria-label={ui.prev}
          >
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <div className="ob-dots" role="tablist" aria-label={ui.tour}>
            {slides.map((s, i) => (
              <button
                key={s.id} type="button" role="tab" aria-selected={i === idx}
                aria-label={`${ui.slide} ${i + 1}`}
                className={i === idx ? "ob-pip on" : "ob-pip"}
                style={{ ["--ob-a" as string]: s.accent }}
                onClick={() => go(i)}
              />
            ))}
          </div>

          {last ? (
            <button type="button" className="ob-cta" onClick={close}>
              {ui.start}
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h13M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : (
            <button type="button" className="ob-cta ghost" onClick={() => go(idx + 1)}>
              {ui.next}
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h13M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
        </footer>

        <div className="ob-meta">
          <span>{ui.hint}</span>
          <span className="ob-reopen">{ui.reopen}</span>
        </div>
        <div className="ob-progress" aria-hidden="true"><span style={{ width: `${((idx + 1) / slides.length) * 100}%` }} /></div>
        <p className="ob-sr" aria-live="polite">{`${ui.slide} ${idx + 1} ${ui.of} ${slides.length}: ${active.title}`}</p>
      </div>
    </div>,
    document.body,
  );
}

export default OnboardingDialog;
