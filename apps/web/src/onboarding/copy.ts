export type Lang = "ru" | "en";

export interface Slide {
  id: string;
  accent: string;
  accent2: string;
  kicker: string;
  title: string;
  body: string;
  chips: string[];
}

export const UI: Record<Lang, Record<string, string>> = {
  ru: {
    tour: "Быстрый тур",
    skip: "Пропустить",
    next: "Дальше",
    prev: "Назад",
    start: "Начать",
    of: "из",
    hint: "Свайп, стрелки или клавиши ← →",
    reopen: "Открыть снова: Alt + H",
    slide: "Экран",
    done: "Готово",
  },
  en: {
    tour: "Quick tour",
    skip: "Skip",
    next: "Next",
    prev: "Back",
    start: "Get started",
    of: "of",
    hint: "Swipe, arrows or ← → keys",
    reopen: "Open again: Alt + H",
    slide: "Slide",
    done: "Done",
  },
};

export const SLIDES: Record<Lang, Slide[]> = {
  ru: [
    {
      id: "capture",
      accent: "#2DD4BF",
      accent2: "#6EE7B7",
      kicker: "Захват",
      title: "Сохрани что угодно",
      body:
        "Ссылки, заметки, PDF, DOCX, XLSX, аудио и фото. Видео из VK и Rutube превращаем в текст — поиск найдёт по тому, что сказано в ролике.",
      chips: ["Ссылки", "Заметки", "PDF · DOCX · XLSX", "Аудио → текст", "Видео VK · Rutube"],
    },
    {
      id: "ai",
      accent: "#34D399",
      accent2: "#10B981",
      kicker: "Обработка",
      title: "ИИ разберёт сам",
      body:
        "Каждый материал получает краткую аннотацию и теги. Раскладывать по папкам вручную не нужно — просто сохрани, остальное сделает конвейер.",
      chips: ["Аннотация", "Теги", "Язык материала", "Прогресс обработки"],
    },
    {
      id: "search",
      accent: "#4ADE80",
      accent2: "#2DD4BF",
      kicker: "Поиск",
      title: "Ищи по смыслу",
      body:
        "Поиск понимает смысл запроса, а не только совпадение слов. Коллекции и фильтры сужают выдачу, когда нужно точнее.",
      chips: ["По смыслу", "По словам", "Коллекции", "Фильтры"],
    },
    {
      id: "export",
      accent: "#10B981",
      accent2: "#86EFAC",
      kicker: "Свобода",
      title: "Забирай с собой",
      body:
        "Экспорт в Markdown, JSON или готовый vault для Obsidian — вместе с файлами. Плюс расширение для браузера и мобильное приложение.",
      chips: ["Markdown", "JSON", "Obsidian + файлы", "Расширение", "Мобильное"],
    },
  ],
  en: [
    {
      id: "capture",
      accent: "#2DD4BF",
      accent2: "#6EE7B7",
      kicker: "Capture",
      title: "Save anything",
      body:
        "Links, notes, PDF, DOCX, XLSX, audio and photos. VK and Rutube videos become text — search finds what was said inside a clip.",
      chips: ["Links", "Notes", "PDF · DOCX · XLSX", "Audio → text", "VK · Rutube video"],
    },
    {
      id: "ai",
      accent: "#34D399",
      accent2: "#10B981",
      kicker: "Processing",
      title: "AI sorts it out",
      body:
        "Every item gets a short annotation and tags. No manual folders — just save it and the pipeline does the rest.",
      chips: ["Annotation", "Tags", "Language", "Live progress"],
    },
    {
      id: "search",
      accent: "#4ADE80",
      accent2: "#2DD4BF",
      kicker: "Search",
      title: "Search by meaning",
      body:
        "Search understands intent, not just word matches. Collections and filters narrow things down when you need precision.",
      chips: ["Meaning", "Keywords", "Collections", "Filters"],
    },
    {
      id: "export",
      accent: "#10B981",
      accent2: "#86EFAC",
      kicker: "Freedom",
      title: "Take it with you",
      body:
        "Export to Markdown, JSON or a ready Obsidian vault — attachments included. Plus a browser extension and a mobile app.",
      chips: ["Markdown", "JSON", "Obsidian + files", "Extension", "Mobile"],
    },
  ],
};
