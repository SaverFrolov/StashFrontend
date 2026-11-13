import type { ApiClient } from "./client";
import { ATTENTION_STATUSES } from "./client";
import type {
  AiSettings,
  ApiToken,
  Collection,
  CollectionPatch,
  ExportOptions,
  Item,
  ItemPatch,
  ItemType,
  Page,
  SaveAudioInput,
  SaveFileInput,
  SaveLinkInput,
  SaveTextInput,
  SearchFilters,
  SearchResult,
  Session,
  Tag,
  UsageInfo,
} from "./types";
import { seedCollections, seedItems, seedTags } from "./seed";

const STORAGE_KEY = "inbox-mock-db-v1";
const SESSION_KEY = "inbox-mock-session-v1";

interface Db {
  items: Item[];
  collections: Collection[];
  tags: Tag[];
  aiSettings: AiSettings;
  apiTokens: ApiToken[];
  recentQueries: string[];
  user: { id: string; name: string; email: string };
}

function freshDb(): Db {
  return {
    items: structuredClone(seedItems),
    collections: structuredClone(seedCollections),
    tags: structuredClone(seedTags),
    aiSettings: {
      provider: "openai",
      baseUrl: "https://api.example-ai.test/v1",
      model: "mock-model-1",
      apiKeySet: false,
      autoProcess: true,
    },
    apiTokens: [
      { id: "tok-1", name: "Phone capture", createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
    ],
    recentQueries: ["pasta recipe", "горы кавказ"],
    user: { id: "u1", name: "Demo User", email: "demo@inbox.test" },
  };
}

function delay(): Promise<void> {
  const ms = 300 + Math.random() * 600;
  return new Promise((r) => setTimeout(r, ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isUrl(text: string): boolean {
  const t = text.trim();
  if (/\s/.test(t) && !t.startsWith("http")) return false;
  const candidate = t.split(/\s+/).length === 1 ? t : "";
  if (!candidate) {
    const m = t.match(/^(\S+)\s/);
    void m;
    return false;
  }
  try {
    const u = new URL(candidate);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function splitUrlAndComment(text: string): { url: string; rest: string } | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  if (!match) return null;
  const urls = text.match(/https?:\/\/[^\s]+/g) ?? [];
  if (urls.length !== 1) return null;
  return { url: match[0], rest: text.replace(match[0], "").trim() };
}

function guessLang(text: string): string | undefined {
  if (!text) return undefined;
  if (/[а-яА-ЯёЁ]/.test(text)) return "ru";
  if (/[a-zA-Z]/.test(text)) return "en";
  return undefined;
}

function titleFromText(text: string): string {
  const firstLine = text.split("\n")[0].trim();
  return firstLine.length > 80 ? `${firstLine.slice(0, 80).trimEnd()}…` : firstLine;
}

const ANNOTATIONS: Record<string, string> = {
  ru: "Короткая аннотация (демо): сохранённый материал относится к одной из личных тем пользователя; ключевые сущности упомянуты в тегах.",
  en: "Short annotation (demo): the saved material belongs to one of the user's personal topics; key entities are reflected in the tags.",
};

const SUGGESTED_TAGS = ["interesting", "later", "reference"];

export class MockApi implements ApiClient {
  private db: Db;
  private session: Session | null = null;

  constructor() {
    this.db = this.load();
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) this.session = JSON.parse(raw) as Session;
    } catch {
      this.session = null;
    }
  }

  private load(): Db {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Db;
    } catch {
      /* fall through to seed */
    }
    const db = freshDb();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage may be unavailable (private mode) */
    }
    return db;
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      /* ignore quota errors */
    }
  }

  private saveSession(): void {
    try {
      if (this.session) localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }

  private touchItem(id: string): void {
    const item = this.db.items.find((i) => i.id === id);
    if (!item) return;
    for (const cid of item.collectionIds) {
      const col = this.db.collections.find((c) => c.id === cid);
      if (col) col.updatedAt = new Date().toISOString();
    }
    this.persist();
  }

  // ---- auth ----

  async signIn(email: string, _password: string): Promise<Session> {
    await delay();
    this.session = { token: uid("tok"), user: { id: "u1", name: this.db.user.name || email.split("@")[0], email } };
    this.db.user.email = email;
    this.saveSession();
    this.persist();
    return this.session;
  }

  async signUp(name: string, email: string, _password: string): Promise<Session> {
    await delay();
    this.db.user = { id: "u1", name, email };
    this.session = { token: uid("tok"), user: { id: "u1", name, email } };
    this.saveSession();
    this.persist();
    return this.session;
  }

  async requestPasswordReset(_email: string): Promise<void> {
    await delay();
  }

  async signOut(): Promise<void> {
    this.session = null;
    this.saveSession();
  }

  getSession(): Session | null {
    return this.session;
  }

  // ---- items ----

  async listItems(opts: {
    cursor?: string;
    limit?: number;
    filter?: "all" | "attention" | ItemType;
  }): Promise<Page<Item>> {
    await delay();
    let items = [...this.db.items].sort(
      (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
    );
    if (opts.filter === "attention") {
      items = items.filter((i) => ATTENTION_STATUSES.includes(i.status));
    } else if (opts.filter && opts.filter !== "all") {
      const f = opts.filter;
      items = items.filter((i) => {
        if (f === "link") return i.type === "link";
        if (f === "text") return i.type === "text";
        if (f === "audio") return i.type === "audio";
        if (f === "pdf" || f === "docx") return i.type === "pdf" || i.type === "docx";
        return true;
      });
    }
    const limit = opts.limit ?? 20;
    // Feed is newest-at-bottom; pages load upward, so a page is the *last*
    // `limit` items before the cursor (cursor = capturedAt of oldest loaded item).
    if (opts.cursor) {
      const idx = items.findIndex((i) => i.capturedAt < opts.cursor!);
      const end = idx === -1 ? 0 : idx;
      const start = Math.max(end - limit, 0);
      return { items: items.slice(start, end), hasMore: start > 0, total: items.length };
    }
    const start = Math.max(items.length - limit, 0);
    return { items: items.slice(start), hasMore: start > 0, total: items.length };
  }

  async getItem(id: string): Promise<Item> {
    await delay();
    const item = this.db.items.find((i) => i.id === id);
    if (!item) throw new Error(`Item ${id} not found`);
    return structuredClone(item);
  }

  private newItem(partial: Pick<Item, "type" | "status" | "title"> & Partial<Item>): Item {
    const item: Item = {
      id: uid("item"),
      capturedAt: new Date().toISOString(),
      source: {},
      original: {},
      extracted: {},
      ai: { tags: [], model: this.db.aiSettings.model, edited: false },
      userTags: [],
      suggestedTags: [],
      collectionIds: [],
      processing: [],
      ...partial,
    };
    return item;
  }

  private runPipeline(item: Item, sourceText: string): void {
    item.status = "extracting";
    item.processing = [
      { name: "extract", status: "running", startedAt: new Date().toISOString() },
      { name: "annotate", status: "pending" },
    ];
    this.persist();

    const extractionStep = item.processing[0];
    const annotateStep = item.processing[1];

    const extractMs = 1200 + Math.random() * 1500;
    const annotateMs = 1500 + Math.random() * 1500;
    const failExtraction = item.type === "link" && Math.random() < 0.12;
    const failAi = Math.random() < 0.08;

    window.setTimeout(() => {
      extractionStep.finishedAt = new Date().toISOString();
      if (failExtraction) {
        extractionStep.status = "failed";
        extractionStep.error = "Failed to retrieve page content: site returned HTTP 503";
        item.extracted = { error: extractionStep.error };
        annotateStep.status = "skipped";
        item.status = "extraction_failed";
      } else {
        extractionStep.status = "ok";
        if (item.type === "link" || item.type === "pdf" || item.type === "docx") {
          item.extracted = { text: sourceText || `Extracted text preview for "${item.title}" (mock data).` };
        } else {
          extractionStep.status = "skipped";
        }
        item.status = "annotating";
        annotateStep.status = "running";
        annotateStep.startedAt = new Date().toISOString();
        this.persist();
        window.setTimeout(() => {
          annotateStep.finishedAt = new Date().toISOString();
          if (failAi) {
            annotateStep.status = "failed";
            annotateStep.error = "AI model timeout after 30 s";
            item.status = "ai_failed";
          } else {
            annotateStep.status = "ok";
            const lang = item.lang ?? "en";
            item.ai.annotation = ANNOTATIONS[lang] ?? ANNOTATIONS.en;
            item.ai.generatedAt = new Date().toISOString();
            item.ai.tags = [...(item.userTags.length ? item.userTags.slice(0, 1) : []), SUGGESTED_TAGS[Math.floor(Math.random() * SUGGESTED_TAGS.length)]];
            item.suggestedTags = Array.from(new Set(item.ai.tags)).slice(0, 2);
            item.status = "done";
          }
          this.persist();
          this.touchItem(item.id);
          window.dispatchEvent(new CustomEvent("inbox:mock-item-updated", { detail: { id: item.id } }));
        }, annotateMs);
      }
      this.persist();
      window.dispatchEvent(new CustomEvent("inbox:mock-item-updated", { detail: { id: item.id } }));
    }, extractMs);
  }

  async saveText(input: SaveTextInput): Promise<Item> {
    await delay();
    const urlSplit = splitUrlAndComment(input.text);
    if (urlSplit) return this.saveLink({ url: urlSplit.url, comment: [urlSplit.rest, input.comment].filter(Boolean).join(" ") || undefined, collectionIds: input.collectionIds });
    const text = input.text.trim();
    const item = this.newItem({
      type: "text",
      status: "saved",
      title: titleFromText(text),
      lang: guessLang(text),
      original: { text },
      userComment: input.comment,
      collectionIds: input.collectionIds ?? [],
    });
    this.db.items.push(item);
    this.persist();
    if (this.db.aiSettings.autoProcess) this.runPipeline(item, text);
    return structuredClone(item);
  }

  async saveLink(input: SaveLinkInput): Promise<Item> {
    await delay();
    const item = this.newItem({
      type: "link",
      status: "saved",
      title: input.url,
      lang: undefined,
      source: { url: input.url, name: domainOf(input.url) },
      userComment: input.comment,
      collectionIds: input.collectionIds ?? [],
    });
    this.db.items.push(item);
    this.persist();
    if (this.db.aiSettings.autoProcess) this.runPipeline(item, "");
    return structuredClone(item);
  }

  async saveFile(input: SaveFileInput): Promise<Item> {
    await delay();
    const mime = input.file.mime;
    const type: ItemType = mime === "application/pdf" ? "pdf" : "docx";
    const item = this.newItem({
      type,
      status: "saved",
      title: input.file.name,
      lang: guessLang(input.file.name),
      source: { name: input.file.name },
      original: { file: { name: input.file.name, size: input.file.size, mime, url: input.file.dataUrl } },
      userComment: input.comment,
      collectionIds: input.collectionIds ?? [],
    });
    this.db.items.push(item);
    this.persist();
    if (this.db.aiSettings.autoProcess) this.runPipeline(item, "");
    return structuredClone(item);
  }

  async saveAudio(input: SaveAudioInput): Promise<Item> {
    await delay();
    const item = this.newItem({
      type: "audio",
      status: "saved",
      title: input.blob.name,
      original: { file: { name: input.blob.name, size: input.blob.size, mime: input.blob.mime, url: input.blob.dataUrl } },
      userComment: input.comment,
    });
    this.db.items.push(item);
    this.persist();
    // Transcription is unavailable in the mock: audio always ends as partial.
    window.setTimeout(() => {
      item.status = "partial";
      item.extracted = { error: "Audio saved; transcription not available" };
      item.processing = [
        { name: "extract", status: "failed", startedAt: item.capturedAt, finishedAt: new Date().toISOString(), error: "Transcription service unavailable" },
        { name: "annotate", status: "skipped" },
      ];
      this.persist();
      window.dispatchEvent(new CustomEvent("inbox:mock-item-updated", { detail: { id: item.id } }));
    }, 1500);
    return structuredClone(item);
  }

  async patchItem(id: string, patch: ItemPatch): Promise<Item> {
    await delay();
    const item = this.db.items.find((i) => i.id === id);
    if (!item) throw new Error(`Item ${id} not found`);
    if (patch.title !== undefined) item.title = patch.title;
    if (patch.userComment !== undefined) item.userComment = patch.userComment;
    if (patch.aiAnnotation !== undefined) {
      item.ai.annotation = patch.aiAnnotation;
      item.ai.edited = patch.aiEdited ?? true;
    }
    if (patch.restoreAi) {
      item.ai.edited = false;
      item.ai.annotation = ANNOTATIONS[item.lang ?? "en"] ?? ANNOTATIONS.en;
    }
    if (patch.userTags !== undefined) item.userTags = patch.userTags;
    if (patch.acceptSuggestedTag) {
      item.suggestedTags = item.suggestedTags.filter((t) => t !== patch.acceptSuggestedTag);
      if (!item.userTags.includes(patch.acceptSuggestedTag)) item.userTags.push(patch.acceptSuggestedTag);
      const existing = this.db.tags.find((t) => t.name === patch.acceptSuggestedTag);
      if (!existing) this.db.tags.push({ id: uid("tag"), name: patch.acceptSuggestedTag, origin: "user" });
    }
    if (patch.removeSuggestedTag) {
      item.suggestedTags = item.suggestedTags.filter((t) => t !== patch.removeSuggestedTag);
    }
    if (patch.collectionIds !== undefined) item.collectionIds = patch.collectionIds;
    if (patch.lang !== undefined) item.lang = patch.lang;
    this.persist();
    this.touchItem(id);
    return structuredClone(item);
  }

  async deleteItems(ids: string[]): Promise<void> {
    await delay();
    this.db.items = this.db.items.filter((i) => !ids.includes(i.id));
    this.persist();
  }

  async reprocessItem(id: string): Promise<Item> {
    await delay();
    const item = this.db.items.find((i) => i.id === id);
    if (!item) throw new Error(`Item ${id} not found`);
    item.ai.annotation = undefined;
    item.ai.edited = false;
    item.ai.tags = [];
    item.suggestedTags = [];
    this.runPipeline(item, item.extracted.text ?? item.original.text ?? "");
    return structuredClone(item);
  }

  async retryExtraction(id: string): Promise<Item> {
    await delay();
    const item = this.db.items.find((i) => i.id === id);
    if (!item) throw new Error(`Item ${id} not found`);
    this.runPipeline(item, item.extracted.text ?? item.original.text ?? "");
    return structuredClone(item);
  }

  async attentionCount(): Promise<{ count: number }> {
    await delay();
    return { count: this.db.items.filter((i) => ATTENTION_STATUSES.includes(i.status)).length };
  }

  async relatedItems(id: string, limit = 5): Promise<Item[]> {
    await delay();
    const item = this.db.items.find((i) => i.id === id);
    if (!item) return [];
    const scored = this.db.items
      .filter((i) => i.id !== id)
      .map((i) => {
        let score = 0;
        const aTags = [...item.userTags, ...item.suggestedTags, ...item.ai.tags];
        const bTags = [...i.userTags, ...i.suggestedTags, ...i.ai.tags];
        score += aTags.filter((t) => bTags.includes(t)).length * 2;
        if (i.collectionIds.some((c) => item.collectionIds.includes(c))) score += 2;
        if (i.type === item.type) score += 1;
        if (i.lang && i.lang === item.lang) score += 1;
        return { item: i, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scored.map((s) => structuredClone(s.item));
  }

  // ---- search ----

  async search(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    await delay();
    const q = query.trim().toLowerCase();
    if (q && !this.db.recentQueries.includes(query.trim())) {
      this.db.recentQueries = [query.trim(), ...this.db.recentQueries.filter((r) => r !== query.trim())].slice(0, 8);
      this.persist();
    }
    let items = [...this.db.items].sort(
      (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    );
    if (filters.types?.length) items = items.filter((i) => filters.types!.includes(i.type));
    if (filters.collectionIds?.length) items = items.filter((i) => i.collectionIds.some((c) => filters.collectionIds!.includes(c)));
    if (filters.tagIds?.length) {
      const names = filters.tagIds
        .map((tid) => this.db.tags.find((t) => t.id === tid)?.name)
        .filter((n): n is string => Boolean(n));
      items = items.filter((i) =>
        [...i.userTags, ...i.suggestedTags, ...i.ai.tags].some((t) => names.includes(t)),
      );
    }
    if (filters.statuses?.length) items = items.filter((i) => filters.statuses!.includes(i.status));
    if (filters.dateFrom) items = items.filter((i) => i.capturedAt >= filters.dateFrom!);
    if (filters.dateTo) items = items.filter((i) => i.capturedAt <= `${filters.dateTo}T23:59:59.999Z`);

    if (!q) return [];

    const words = q.split(/\s+/).filter((w) => w.length > 2);
    const results: SearchResult[] = [];
    for (const item of items) {
      const haystack = [item.title, item.userComment ?? "", item.ai.annotation ?? "", item.extracted.text ?? "", item.original.text ?? "", [...item.userTags, ...item.ai.tags].join(" ")].join("\n");
      const lower = haystack.toLowerCase();
      const keywordHits = words.filter((w) => lower.includes(w));
      if (filters.mode === "keywords") {
        if (keywordHits.length === words.length && words.length > 0) {
          results.push({ item: structuredClone(item), snippet: this.snippet(item, keywordHits[0]), matchKind: "keyword" });
        }
      } else if (filters.mode === "meaning") {
        // Mock semantic match: any overlap of >= 4-char stem counts as "meaning".
        if (keywordHits.length > 0 || words.some((w) => lower.includes(w.slice(0, Math.max(4, w.length - 2))))) {
          results.push({ item: structuredClone(item), snippet: this.snippet(item, keywordHits[0] ?? words[0]), matchKind: "meaning" });
        }
      } else {
        if (keywordHits.length === words.length && words.length > 0) {
          results.push({ item: structuredClone(item), snippet: this.snippet(item, keywordHits[0]), matchKind: "keyword" });
        } else if (words.some((w) => lower.includes(w.slice(0, Math.max(4, w.length - 2))))) {
          results.push({ item: structuredClone(item), snippet: this.snippet(item, words[0]), matchKind: "meaning" });
        }
      }
    }
    return results.slice(0, 50);
  }

  private snippet(item: Item, word?: string): string | undefined {
    const text = item.extracted.text ?? item.original.text ?? item.ai.annotation ?? item.userComment;
    if (!text) return undefined;
    if (!word) return text.slice(0, 160);
    const idx = text.toLowerCase().indexOf(word.toLowerCase());
    if (idx === -1) return text.slice(0, 160);
    const start = Math.max(0, idx - 60);
    return `${start > 0 ? "…" : ""}${text.slice(start, start + 160)}…`;
  }

  async recentQueries(): Promise<string[]> {
    await delay();
    return [...this.db.recentQueries];
  }

  // ---- collections ----

  async listCollections(): Promise<Collection[]> {
    await delay();
    return structuredClone(this.db.collections);
  }

  async createCollection(name: string, description?: string): Promise<Collection> {
    await delay();
    const col: Collection = {
      id: uid("col"),
      name: name.trim(),
      description: description?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.collections.push(col);
    this.persist();
    return structuredClone(col);
  }

  async getCollection(id: string): Promise<Collection> {
    await delay();
    const col = this.db.collections.find((c) => c.id === id);
    if (!col) throw new Error(`Collection ${id} not found`);
    return structuredClone(col);
  }

  async patchCollection(id: string, patch: CollectionPatch): Promise<Collection> {
    await delay();
    const col = this.db.collections.find((c) => c.id === id);
    if (!col) throw new Error(`Collection ${id} not found`);
    if (patch.name !== undefined) col.name = patch.name.trim();
    if (patch.description !== undefined) col.description = patch.description.trim() || undefined;
    col.updatedAt = new Date().toISOString();
    this.persist();
    return structuredClone(col);
  }

  async deleteCollection(id: string): Promise<void> {
    await delay();
    this.db.collections = this.db.collections.filter((c) => c.id !== id);
    for (const item of this.db.items) {
      item.collectionIds = item.collectionIds.filter((c) => c !== id);
    }
    this.persist();
  }

  async addToCollection(itemIds: string[], collectionId: string): Promise<void> {
    await delay();
    for (const id of itemIds) {
      const item = this.db.items.find((i) => i.id === id);
      if (item && !item.collectionIds.includes(collectionId)) item.collectionIds.push(collectionId);
    }
    const col = this.db.collections.find((c) => c.id === collectionId);
    if (col) col.updatedAt = new Date().toISOString();
    this.persist();
  }

  async removeFromCollection(itemIds: string[], collectionId: string): Promise<void> {
    await delay();
    for (const id of itemIds) {
      const item = this.db.items.find((i) => i.id === id);
      if (item) item.collectionIds = item.collectionIds.filter((c) => c !== collectionId);
    }
    this.persist();
  }

  // ---- tags ----

  async listTags(): Promise<Tag[]> {
    await delay();
    // Merge seed tag list with tags actually referenced by items.
    const referenced = new Set<string>();
    for (const item of this.db.items) {
      for (const t of item.userTags) referenced.add(t);
      for (const t of item.ai.tags) referenced.add(t);
    }
    for (const name of referenced) {
      if (!this.db.tags.some((t) => t.name === name)) {
        this.db.tags.push({ id: uid("tag"), name, origin: "ai" });
      }
    }
    this.persist();
    return structuredClone(this.db.tags);
  }

  async renameTag(id: string, name: string): Promise<Tag> {
    await delay();
    const tag = this.db.tags.find((t) => t.id === id);
    if (!tag) throw new Error(`Tag ${id} not found`);
    const old = tag.name;
    tag.name = name.trim();
    for (const item of this.db.items) {
      item.userTags = item.userTags.map((t) => (t === old ? tag.name : t));
      item.suggestedTags = item.suggestedTags.map((t) => (t === old ? tag.name : t));
      item.ai.tags = item.ai.tags.map((t) => (t === old ? tag.name : t));
    }
    this.persist();
    return structuredClone(tag);
  }

  async mergeTags(sourceIds: string[], targetId: string): Promise<Tag> {
    await delay();
    const target = this.db.tags.find((t) => t.id === targetId);
    if (!target) throw new Error(`Tag ${targetId} not found`);
    const sourceNames = this.db.tags.filter((t) => sourceIds.includes(t.id)).map((t) => t.name);
    for (const item of this.db.items) {
      const map = (arr: string[]) => Array.from(new Set(arr.map((t) => (sourceNames.includes(t) ? target.name : t))));
      item.userTags = map(item.userTags);
      item.suggestedTags = map(item.suggestedTags);
      item.ai.tags = map(item.ai.tags);
    }
    this.db.tags = this.db.tags.filter((t) => !sourceIds.includes(t.id));
    this.persist();
    return structuredClone(target);
  }

  async deleteTag(id: string): Promise<void> {
    await delay();
    const tag = this.db.tags.find((t) => t.id === id);
    if (!tag) return;
    for (const item of this.db.items) {
      item.userTags = item.userTags.filter((t) => t !== tag.name);
      item.suggestedTags = item.suggestedTags.filter((t) => t !== tag.name);
      item.ai.tags = item.ai.tags.filter((t) => t !== tag.name);
    }
    this.db.tags = this.db.tags.filter((t) => t.id !== id);
    this.persist();
  }

  // ---- settings ----

  async getAiSettings(): Promise<AiSettings> {
    await delay();
    return { ...this.db.aiSettings };
  }

  async saveAiSettings(settings: Partial<AiSettings> & { apiKey?: string }): Promise<AiSettings> {
    await delay();
    const { apiKey, ...rest } = settings;
    this.db.aiSettings = { ...this.db.aiSettings, ...rest };
    if (apiKey) this.db.aiSettings.apiKeySet = true;
    this.persist();
    return { ...this.db.aiSettings };
  }

  async testAiConnection(): Promise<{ ok: boolean; message?: string }> {
    await delay();
    if (!this.db.aiSettings.baseUrl) return { ok: false, message: "Base URL is empty" };
    return Math.random() < 0.7
      ? { ok: true, message: `Connected to ${this.db.aiSettings.model}` }
      : { ok: false, message: "Connection timed out (simulated)" };
  }

  async updateAccount(patch: { name?: string; password?: string }): Promise<void> {
    await delay();
    if (patch.name !== undefined) this.db.user.name = patch.name;
    if (this.session) this.session.user.name = this.db.user.name;
    this.saveSession();
    this.persist();
  }

  async deleteAccount(): Promise<void> {
    await delay();
    this.db = freshDb();
    this.session = null;
    this.saveSession();
    this.persist();
  }

  // ---- api tokens ----

  async listApiTokens(): Promise<ApiToken[]> {
    await delay();
    return structuredClone(this.db.apiTokens);
  }

  async createApiToken(name: string, expiresInDays?: number): Promise<{ token: ApiToken; secret: string }> {
    await delay();
    const token: ApiToken = {
      id: uid("tok"),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : undefined,
    };
    this.db.apiTokens.push(token);
    this.persist();
    return { token: structuredClone(token), secret: `inb_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}` };
  }

  async revokeApiToken(id: string): Promise<void> {
    await delay();
    this.db.apiTokens = this.db.apiTokens.filter((t) => t.id !== id);
    this.persist();
  }

  // ---- export / usage ----

  async exportData(options: ExportOptions): Promise<{ blob: Blob; filename: string }> {
    await delay();
    let items = [...this.db.items];
    if (options.scope === "collection" && options.collectionId) {
      items = items.filter((i) => i.collectionIds.includes(options.collectionId!));
    } else if (options.scope === "selected" && options.itemIds) {
      items = items.filter((i) => options.itemIds!.includes(i.id));
    }
    const stripped = items.map((i) => {
      const copy = structuredClone(i);
      if (!options.includeOriginals) copy.original = {};
      if (!options.includeExtracted) copy.extracted = {};
      if (!options.includeAi) copy.ai = { tags: [], model: copy.ai.model, edited: false };
      if (!options.includeComments) copy.userComment = undefined;
      return copy;
    });
    if (options.format === "markdown") {
      const md = stripped
        .map((i) => {
          const lines = [`# ${i.title}`, "", `- Type: ${i.type}`, `- Captured: ${i.capturedAt}`, `- Status: ${i.status}`];
          if (i.source.url) lines.push(`- Source: ${i.source.url}`);
          if (i.original.text) lines.push("", "## Original", "", i.original.text);
          if (i.extracted.text) lines.push("", "## Extracted text", "", i.extracted.text);
          if (i.ai.annotation) lines.push("", "## AI annotation", "", i.ai.annotation);
          if (i.userComment) lines.push("", "## My comment", "", i.userComment);
          return lines.join("\n");
        })
        .join("\n\n---\n\n");
      return { blob: new Blob([md], { type: "text/markdown" }), filename: "stash-export.md" };
    }
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), items: stripped }, null, 2);
    return { blob: new Blob([json], { type: "application/json" }), filename: "stash-export.json" };
  }

  async usage(): Promise<UsageInfo> {
    await delay();
    const bytes = new Blob([JSON.stringify(this.db)]).size;
    const filesBytes = this.db.items.reduce((acc, i) => acc + (i.original.file?.size ?? 0), 0);
    return { bytesUsed: bytes + filesBytes };
  }
}
