import "./update.css";

const RELOAD_KEY = "stash.sw.reloadedAt";
const CHECK_MS = 30 * 60 * 1000;

let toast: HTMLElement | null = null;
let hadController = false;
let handled = false;

function isIdle(): boolean {
  if (document.hidden) return true;
  const a = document.activeElement as HTMLElement | null;
  if (!a) return true;
  return !(a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
}

function reload(): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 15000) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* приватный режим — просто перезагружаем */
  }
  location.reload();
}

function hide(): void {
  toast?.classList.remove("on");
}

function offer(): void {
  if (toast) {
    toast.classList.add("on");
    return;
  }
  const el = document.createElement("div");
  el.className = "sw-toast";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");

  const icon = document.createElement("i");
  icon.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = "Новая версия Stash загружена";

  const go = document.createElement("button");
  go.type = "button";
  go.className = "go";
  go.textContent = "Обновить";
  go.addEventListener("click", reload);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "x";
  close.setAttribute("aria-label", "Позже");
  close.textContent = "✕";
  close.addEventListener("click", hide);

  el.append(icon, text, go, close);
  document.body.appendChild(el);
  toast = el;
  requestAnimationFrame(() => el.classList.add("on"));

  const idleTimer = window.setInterval(() => {
    if (isIdle()) {
      window.clearInterval(idleTimer);
      reload();
    }
  }, 5000);
  window.setTimeout(() => window.clearInterval(idleTimer), 10 * 60 * 1000);
}

async function init(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

  try {
    const probe = await fetch("/sw.js", { cache: "no-store" });
    const ct = probe.headers.get("content-type") || "";
    if (!probe.ok || !/javascript|ecmascript/i.test(ct)) return;
  } catch {
    return;
  }

  hadController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (handled) return;
    handled = true;
    if (isIdle()) reload();
    else offer();
  });

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    const ping = () => { void reg.update().catch(() => undefined); };
    ping();
    window.setInterval(ping, CHECK_MS);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) ping();
    });
    window.addEventListener("online", ping);
  } catch {
    /* воркер не поднялся — приложение продолжает работать без офлайна */
  }
}

void init();
