/**
 * Прижатие кнопки «Новая заметка» к стыкованному фильтр-бару.
 * Меряет реальную левую кромку бара и выставляет хедеру правый отступ,
 * чтобы кнопка встала слева от бара с зазором, а не висела в середине.
 */
const GAP = 14;
const MIN = 16;

let frame = 0;

function sync(): void {
  const header = document.querySelector<HTMLElement>('header[data-app-header="desktop"]');
  if (!header) return;
  if (header.getAttribute("data-condensed") !== "true") {
    header.style.paddingRight = "";
    return;
  }
  const bar = document.querySelector<HTMLElement>('[data-dock="bar"]');
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  if (rect.width < 1) return;
  const max = window.innerWidth * 0.7;
  const pad = Math.min(max, Math.max(MIN, window.innerWidth - rect.left + GAP));
  header.style.paddingRight = `${Math.round(pad)}px`;
}

function schedule(): void {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    sync();
  });
}

function init(): void {
  if (typeof window === "undefined") return;
  schedule();
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });

  const mo = new MutationObserver(schedule);
  mo.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-condensed", "class", "style"],
  });

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(schedule);
    ro.observe(document.documentElement);
  }

  document.addEventListener("transitionend", schedule, true);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
