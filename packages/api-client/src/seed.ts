import type { Collection, Item, Tag } from "./types";

const now = Date.now();
const H = 3600_000;
const D = 24 * H;

function iso(msAgo: number): string {
  return new Date(now - msAgo).toISOString();
}

export const seedCollections: Collection[] = [
  {
    id: "col-cooking",
    name: "Cooking",
    description: "Recipes and food ideas to try",
    createdAt: iso(30 * D),
    updatedAt: iso(2 * D),
  },
  {
    id: "col-travel",
    name: "Travel ideas",
    description: "Places, routes and logistics",
    createdAt: iso(25 * D),
    updatedAt: iso(5 * D),
  },
  {
    id: "col-study",
    name: "Study materials",
    description: "Articles, regulations and guides",
    createdAt: iso(20 * D),
    updatedAt: iso(1 * D),
  },
];

const tagNames: Array<[string, "user" | "ai"]> = [
  ["recipes", "ai"],
  ["pasta", "ai"],
  ["travel", "ai"],
  ["mountains", "user"],
  ["ml", "ai"],
  ["research", "ai"],
  ["regulations", "ai"],
  ["taxes", "user"],
  ["study", "user"],
  ["ideas", "ai"],
  ["audio", "ai"],
  ["todo", "user"],
];

export const seedTags: Tag[] = tagNames.map(([name, origin], i) => ({
  id: `tag-${i + 1}`,
  name,
  origin,
}));

function base(
  id: string,
  type: Item["type"],
  status: Item["status"],
  title: string,
  capturedAgo: number,
  extra: Partial<Item> = {},
): Item {
  return {
    id,
    type,
    status,
    title,
    capturedAt: iso(capturedAgo),
    source: {},
    original: {},
    extracted: {},
    ai: { tags: [], model: "mock-model-1", generatedAt: undefined, edited: false },
    userTags: [],
    suggestedTags: [],
    collectionIds: [],
    processing: [],
    ...extra,
  };
}

export const seedItems: Item[] = [
  base("item-01", "link", "done", "Classic spaghetti carbonara — recipe", 14 * D, {
    lang: "en",
    source: { url: "https://example-cooking.test/carbonara", name: "example-cooking.test", publishedAt: iso(400 * D) },
    ai: {
      annotation: "A step-by-step carbonara recipe with guanciale, pecorino and eggs; notes on avoiding scrambled eggs in the sauce.",
      tags: ["recipes", "pasta"],
      model: "mock-model-1",
      generatedAt: iso(14 * D - 40_000),
      edited: false,
    },
    userComment: "Try this on the weekend. Buy pecorino in advance.",
    suggestedTags: ["italian"],
    collectionIds: ["col-cooking"],
    extracted: { text: "Spaghetti carbonara. Ingredients: spaghetti 400 g, guanciale 150 g, pecorino romano 100 g, eggs 4, black pepper. Method: render guanciale, mix eggs with cheese, combine off heat..." },
    processing: [
      { name: "extract", status: "ok", startedAt: iso(14 * D), finishedAt: iso(14 * D - 20_000) },
      { name: "annotate", status: "ok", startedAt: iso(14 * D - 20_000), finishedAt: iso(14 * D - 40_000) },
    ],
  }),
  base("item-02", "link", "done", "10 мест в горах Кавказа, которые стоит увидеть", 13 * D, {
    lang: "ru",
    source: { url: "https://travel-notes.test/caucasus-top10", name: "travel-notes.test" },
    ai: {
      annotation: "Обзор десяти горных локаций Кавказа: Архыз, Домбай, Безенги и другие. Для каждой — сезон, сложность маршрута и логистика.",
      tags: ["travel", "mountains"],
      model: "mock-model-1",
      generatedAt: iso(13 * D - 60_000),
      edited: false,
    },
    collectionIds: ["col-travel"],
    extracted: { text: "Архыз — посёлок в Карачаево-Черкесии, известен Софийскими озёрами. Лучший сезон: июнь–сентябрь..." },
    processing: [
      { name: "extract", status: "ok", startedAt: iso(13 * D), finishedAt: iso(13 * D - 30_000) },
      { name: "annotate", status: "ok", startedAt: iso(13 * D - 30_000), finishedAt: iso(13 * D - 60_000) },
    ],
  }),
  base("item-03", "link", "done", "Attention Is All You Need (arXiv paper)", 12 * D, {
    lang: "en",
    source: { url: "https://arxiv.test/abs/1706.03762", name: "arxiv.test", publishedAt: iso(3000 * D) },
    ai: {
      annotation: "The original Transformer paper: proposes an architecture based solely on attention mechanisms, dropping recurrence and convolutions.",
      tags: ["ml", "research"],
      model: "mock-model-1",
      generatedAt: iso(12 * D - 90_000),
      edited: false,
    },
    collectionIds: ["col-study"],
    extracted: { text: "Abstract: The dominant sequence transduction models are based on complex recurrent or convolutional neural networks..." },
    processing: [
      { name: "extract", status: "ok", startedAt: iso(12 * D), finishedAt: iso(12 * D - 45_000) },
      { name: "annotate", status: "ok", startedAt: iso(12 * D - 45_000), finishedAt: iso(12 * D - 90_000) },
    ],
  }),
  base("item-04", "pdf", "done", "Налоговый кодекс — выписка, глава 23.pdf", 11 * D, {
    lang: "ru",
    source: { name: "Налоговый кодекс — выписка, глава 23.pdf" },
    original: { file: { name: "nk-glava-23.pdf", size: 2_450_000, mime: "application/pdf", url: "blob:mock/nk-glava-23.pdf" } },
    ai: {
      annotation: "Выписка из главы 23: порядок исчисления НДФЛ, ставки, налоговые вычеты и сроки отчётности.",
      tags: ["regulations", "taxes"],
      model: "mock-model-1",
      generatedAt: iso(11 * D - 120_000),
      edited: false,
    },
    collectionIds: ["col-study"],
    extracted: { text: "Статья 224. Налоговые ставки. 1. Налоговая ставка устанавливается в размере 13 процентов..." },
    processing: [
      { name: "extract", status: "ok", startedAt: iso(11 * D), finishedAt: iso(11 * D - 60_000) },
      { name: "annotate", status: "ok", startedAt: iso(11 * D - 60_000), finishedAt: iso(11 * D - 120_000) },
    ],
  }),
  base("item-05", "docx", "done", "Методические указания к лабораторным работам.docx", 10 * D, {
    lang: "ru",
    source: { name: "Методические указания к лабораторным работам.docx" },
    original: { file: { name: "metodichka.docx", size: 1_100_000, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", url: "blob:mock/metodichka.docx" } },
    ai: {
      annotation: "Методичка по курсу: цели работ, порядок выполнения, требования к отчётам и критерии оценивания.",
      tags: ["study"],
      model: "mock-model-1",
      generatedAt: iso(10 * D - 100_000),
      edited: true,
    },
    collectionIds: ["col-study"],
    extracted: { text: "1. Цели и задачи дисциплины. 2. Порядок выполнения лабораторных работ..." },
    processing: [
      { name: "extract", status: "ok", startedAt: iso(10 * D), finishedAt: iso(10 * D - 50_000) },
      { name: "annotate", status: "ok", startedAt: iso(10 * D - 50_000), finishedAt: iso(10 * D - 100_000) },
    ],
  }),
  base("item-06", "text", "done", "Идея: сервис напоминаний о поверке счётчиков", 9 * D, {
    lang: "ru",
    original: { text: "Идея: сервис напоминаний о поверке счётчиков воды и электричества. Монетизация — подписка для управляющих компаний. Проверить спрос на форуме ЖКХ." },
    ai: {
      annotation: "Заметка с продуктовой идеей сервиса напоминаний о поверке счётчиков; упомянуты канал монетизации и способ проверки спроса.",
      tags: ["ideas", "todo"],
      model: "mock-model-1",
      generatedAt: iso(9 * D - 30_000),
      edited: false,
    },
    userComment: "Обсудить с Аней — она работала в ЖКХ-стартапе.",
    processing: [
      { name: "extract", status: "skipped" },
      { name: "annotate", status: "ok", startedAt: iso(9 * D), finishedAt: iso(9 * D - 30_000) },
    ],
  }),
  base("item-07", "audio", "partial", "Голосовая заметка — план поездки в Сочи", 8 * D, {
    lang: "ru",
    original: { file: { name: "voice-note.webm", size: 480_000, mime: "audio/webm", url: "blob:mock/voice-note.webm" } },
    ai: { tags: ["travel", "audio"], model: "mock-model-1", edited: false },
    extracted: { error: "Audio saved; transcription not available" },
    collectionIds: ["col-travel"],
    processing: [
      { name: "extract", status: "failed", startedAt: iso(8 * D), finishedAt: iso(8 * D - 15_000), error: "Transcription service unavailable" },
      { name: "annotate", status: "skipped" },
    ],
  }),
  base("item-08", "link", "partial", "Сравнение тарифов каршеринга — ссылка", 7 * D, {
    lang: "ru",
    source: { url: "https://carshare-review.test/tariffs", name: "carshare-review.test" },
    extracted: { error: "Link only: page content was not retrieved" },
    ai: { tags: [], model: "mock-model-1", edited: false },
    processing: [
      { name: "extract", status: "failed", startedAt: iso(7 * D), finishedAt: iso(7 * D - 10_000), error: "Link only: page content was not retrieved" },
      { name: "annotate", status: "skipped" },
    ],
  }),
  base("item-09", "link", "extraction_failed", "Статья про городское планирование", 6 * D, {
    lang: "ru",
    source: { url: "https://urbanistika.test/city-planning", name: "urbanistika.test" },
    extracted: { error: "Failed to retrieve page content: site returned HTTP 503" },
    ai: { tags: [], model: "mock-model-1", edited: false },
    userComment: "Попробовать сохранить позже — сайт лежал.",
    processing: [
      { name: "extract", status: "failed", startedAt: iso(6 * D), finishedAt: iso(6 * D - 12_000), error: "Failed to retrieve page content: site returned HTTP 503" },
      { name: "annotate", status: "skipped" },
    ],
  }),
  base("item-10", "pdf", "ai_failed", "Договор аренды — шаблон.pdf", 5 * D, {
    lang: "ru",
    source: { name: "Договор аренды — шаблон.pdf" },
    original: { file: { name: "arenda-template.pdf", size: 340_000, mime: "application/pdf", url: "blob:mock/arenda-template.pdf" } },
    extracted: { text: "Договор аренды нежилого помещения. 1. Предмет договора... 2. Права и обязанности сторон..." },
    ai: { tags: [], model: "mock-model-1", edited: false },
    processing: [
      { name: "extract", status: "ok", startedAt: iso(5 * D), finishedAt: iso(5 * D - 40_000) },
      { name: "annotate", status: "failed", startedAt: iso(5 * D - 40_000), finishedAt: iso(5 * D - 55_000), error: "AI model timeout after 30 s" },
    ],
  }),
  base("item-11", "link", "annotating", "Гид по горным приютам Алтая", 2 * H, {
    lang: "ru",
    source: { url: "https://altai-hikes.test/huts-guide", name: "altai-hikes.test" },
    extracted: { text: "Приюты Алтая: Аккемский, Каракольские озёра... Стоимость, сезон, как добраться." },
    ai: { tags: [], model: "mock-model-1", edited: false },
    processing: [
      { name: "extract", status: "ok", startedAt: iso(2 * H), finishedAt: iso(2 * H - 8_000) },
      { name: "annotate", status: "running", startedAt: iso(2 * H - 8_000) },
    ],
  }),
  base("item-12", "text", "done", "Список покупок для похода", 3 * D, {
    lang: "ru",
    original: { text: "Газовый баллон, горелка, палатка на двоих, спальник (комфорт +5), трекинговые палки, аптечка, дождевик." },
    ai: {
      annotation: "Список снаряжения для короткого горного похода: укрытие, сон, приготовление пищи и безопасность.",
      tags: ["travel", "todo"],
      model: "mock-model-1",
      generatedAt: iso(3 * D - 20_000),
      edited: false,
    },
    collectionIds: ["col-travel"],
    userTags: ["поход"],
    processing: [
      { name: "extract", status: "skipped" },
      { name: "annotate", status: "ok", startedAt: iso(3 * D), finishedAt: iso(3 * D - 20_000) },
    ],
  }),
  base("item-13", "link", "done", "Fermented foods and gut health — review", 4 * D, {
    lang: "en",
    source: { url: "https://nutrition-review.test/fermented-gut", name: "nutrition-review.test" },
    ai: {
      annotation: "A review of evidence linking fermented foods to gut microbiome diversity; highlights yogurt, kefir and kimchi studies.",
      tags: ["recipes", "research"],
      model: "mock-model-1",
      generatedAt: iso(4 * D - 70_000),
      edited: false,
    },
    suggestedTags: ["health"],
    collectionIds: ["col-cooking"],
    extracted: { text: "Fermented foods contain live microorganisms that may confer health benefits..." },
    processing: [
      { name: "extract", status: "ok", startedAt: iso(4 * D), finishedAt: iso(4 * D - 30_000) },
      { name: "annotate", status: "ok", startedAt: iso(4 * D - 30_000), finishedAt: iso(4 * D - 70_000) },
    ],
  }),
  base("item-14", "text", "done", "Note: call the university office about documents", 2 * D, {
    lang: "en",
    original: { text: "Call the university office on Monday about the enrollment documents. Ask about the dormitory deadline too." },
    ai: {
      annotation: "A reminder to contact the university office about enrollment paperwork and the dormitory deadline.",
      tags: ["todo", "study"],
      model: "mock-model-1",
      generatedAt: iso(2 * D - 15_000),
      edited: false,
    },
    processing: [
      { name: "extract", status: "skipped" },
      { name: "annotate", status: "ok", startedAt: iso(2 * D), finishedAt: iso(2 * D - 15_000) },
    ],
  }),
  base("item-15", "link", "saved", "Новый стандарт отчётности — черновик", 25 * 60_000, {
    lang: "ru",
    source: { url: "https://standards.test/reporting-draft", name: "standards.test" },
    ai: { tags: [], model: "mock-model-1", edited: false },
    processing: [
      { name: "extract", status: "pending" },
      { name: "annotate", status: "pending" },
    ],
  }),
  base("item-16", "audio", "partial", "Голосовая заметка — идеи для курсовой", 30 * 60_000, {
    lang: "ru",
    original: { file: { name: "coursework-ideas.webm", size: 720_000, mime: "audio/webm", url: "blob:mock/coursework-ideas.webm" } },
    ai: { tags: ["audio", "study"], model: "mock-model-1", edited: false },
    extracted: { error: "Audio saved; transcription not available" },
    processing: [
      { name: "extract", status: "failed", startedAt: iso(30 * 60_000), finishedAt: iso(29 * 60_000), error: "Transcription service unavailable" },
      { name: "annotate", status: "skipped" },
    ],
  }),
  base("item-17", "video", "done", "Лекция: введение в статистику (запись)", 2 * D, {
    lang: "ru",
    source: { name: "Лекция: введение в статистику (запись).mp4" },
    original: { file: { name: "statistics-lecture.mp4", size: 148_000_000, mime: "video/mp4", url: "blob:mock/statistics-lecture.mp4" } },
    ai: {
      annotation: "Видеозапись вводной лекции по статистике: выборки, средние значения, базовые распределения.",
      tags: ["study", "research"],
      model: "mock-model-1",
      generatedAt: iso(2 * D - 60_000),
      edited: false,
    },
    collectionIds: ["col-study"],
    extracted: { text: "Расшифровка видеозаписи (демо): тема лекции — описательная статистика, меры центральной тенденции..." },
    processing: [
      { name: "extract", status: "ok", startedAt: iso(2 * D), finishedAt: iso(2 * D - 30_000) },
      { name: "annotate", status: "ok", startedAt: iso(2 * D - 30_000), finishedAt: iso(2 * D - 60_000) },
    ],
  }),
  base("item-18", "xlsx", "done", "Бюджет поездки в Сочи.xlsx", 1 * D + 4 * H, {
    lang: "ru",
    source: { name: "Бюджет поездки в Сочи.xlsx" },
    original: { file: { name: "budget-sochi.xlsx", size: 46_000, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", url: "blob:mock/budget-sochi.xlsx" } },
    ai: {
      annotation: "Таблица с расчётом бюджета поездки: транспорт, жильё, активности и итоговая сумма по дням.",
      tags: ["travel"],
      model: "mock-model-1",
      generatedAt: iso(1 * D + 4 * H - 45_000),
      edited: false,
    },
    collectionIds: ["col-travel"],
    extracted: { text: "Лист «Бюджет»: Транспорт 12 500 ₽; Жильё 21 000 ₽; Активности 8 400 ₽; Итого 41 900 ₽..." },
    processing: [
      { name: "extract", status: "ok", startedAt: iso(1 * D + 4 * H), finishedAt: iso(1 * D + 4 * H - 20_000) },
      { name: "annotate", status: "ok", startedAt: iso(1 * D + 4 * H - 20_000), finishedAt: iso(1 * D + 4 * H - 45_000) },
    ],
  }),
  base("item-19", "audio", "partial", "Подкаст-интервью о городских проектах.mp3", 5 * H, {
    lang: "ru",
    source: { name: "Подкаст-интервью о городских проектах.mp3" },
    original: { file: { name: "podcast-interview.mp3", size: 34_000_000, mime: "audio/mpeg", url: "blob:mock/podcast-interview.mp3" } },
    ai: { tags: ["audio", "ideas"], model: "mock-model-1", edited: false },
    extracted: { error: "Audio saved; transcription not available" },
    processing: [
      { name: "extract", status: "failed", startedAt: iso(5 * H), finishedAt: iso(4 * H), error: "Transcription service unavailable" },
      { name: "annotate", status: "skipped" },
    ],
  }),
];
