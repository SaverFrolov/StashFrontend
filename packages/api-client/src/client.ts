import type {
  AiSettings,
  ApiToken,
  AttentionCount,
  Collection,
  CollectionPatch,
  ExportOptions,
  Item,
  ItemPatch,
  ItemStatus,
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

export interface ApiClient {
  // auth
  signIn(email: string, password: string): Promise<Session>;
  signUp(name: string, email: string, password: string): Promise<Session>;
  requestPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
  getSession(): Session | null;

  // items
  listItems(opts: {
    cursor?: string;
    limit?: number;
    filter?: "all" | "attention" | ItemType;
  }): Promise<Page<Item>>;
  getItem(id: string): Promise<Item>;
  saveText(input: SaveTextInput): Promise<Item>;
  saveLink(input: SaveLinkInput): Promise<Item>;
  saveFile(input: SaveFileInput): Promise<Item>;
  saveAudio(input: SaveAudioInput): Promise<Item>;
  patchItem(id: string, patch: ItemPatch): Promise<Item>;
  deleteItems(ids: string[]): Promise<void>;
  reprocessItem(id: string): Promise<Item>;
  retryExtraction(id: string): Promise<Item>;
  attentionCount(): Promise<AttentionCount>;
  relatedItems(id: string, limit?: number): Promise<Item[]>;

  // search
  search(query: string, filters: SearchFilters): Promise<SearchResult[]>;
  recentQueries(): Promise<string[]>;

  // collections
  listCollections(): Promise<Collection[]>;
  createCollection(name: string, description?: string): Promise<Collection>;
  getCollection(id: string): Promise<Collection>;
  patchCollection(id: string, patch: CollectionPatch): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  addToCollection(itemIds: string[], collectionId: string): Promise<void>;
  removeFromCollection(itemIds: string[], collectionId: string): Promise<void>;

  // tags
  listTags(): Promise<Tag[]>;
  renameTag(id: string, name: string): Promise<Tag>;
  mergeTags(sourceIds: string[], targetId: string): Promise<Tag>;
  deleteTag(id: string): Promise<void>;

  // settings
  getAiSettings(): Promise<AiSettings>;
  saveAiSettings(settings: Partial<AiSettings> & { apiKey?: string }): Promise<AiSettings>;
  testAiConnection(): Promise<{ ok: boolean; message?: string }>;
  updateAccount(patch: { name?: string; password?: string }): Promise<void>;
  deleteAccount(): Promise<void>;

  // api tokens
  listApiTokens(): Promise<ApiToken[]>;
  createApiToken(name: string, expiresInDays?: number): Promise<{ token: ApiToken; secret: string }>;
  revokeApiToken(id: string): Promise<void>;

  // export / usage
  exportData(options: ExportOptions): Promise<{ blob: Blob; filename: string }>;
  usage(): Promise<UsageInfo>;
}

export const ATTENTION_STATUSES: ItemStatus[] = [
  "partial",
  "extraction_failed",
  "ai_failed",
];

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** REST implementation used when VITE_API_BASE_URL is set. */
export class RestApi implements ApiClient {
  constructor(
    private baseUrl: string,
    private session: Session | null = null,
  ) {}

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    if (this.session) headers.set("Authorization", `Bearer ${this.session.token}`);
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async signIn(email: string, password: string): Promise<Session> {
    const s = await this.req<Session>("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.session = s;
    return s;
  }

  async signUp(name: string, email: string, password: string): Promise<Session> {
    const s = await this.req<Session>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    this.session = s;
    return s;
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.req<void>("/auth/reset-password", { method: "POST", body: JSON.stringify({ email }) });
  }

  async signOut(): Promise<void> {
    this.session = null;
  }

  getSession(): Session | null {
    return this.session;
  }

  listItems(opts: { cursor?: string; limit?: number; filter?: "all" | "attention" | ItemType }): Promise<Page<Item>> {
    return this.req<Page<Item>>(`/items${qs({ cursor: opts.cursor, limit: opts.limit, filter: opts.filter })}`);
  }

  getItem(id: string): Promise<Item> {
    return this.req<Item>(`/items/${id}`);
  }

  saveText(input: SaveTextInput): Promise<Item> {
    return this.req<Item>("/items/text", { method: "POST", body: JSON.stringify(input) });
  }

  saveLink(input: SaveLinkInput): Promise<Item> {
    return this.req<Item>("/items/link", { method: "POST", body: JSON.stringify(input) });
  }

  saveFile(input: SaveFileInput): Promise<Item> {
    return this.req<Item>("/items/file", { method: "POST", body: JSON.stringify(input) });
  }

  saveAudio(input: SaveAudioInput): Promise<Item> {
    return this.req<Item>("/items/audio", { method: "POST", body: JSON.stringify(input) });
  }

  patchItem(id: string, patch: ItemPatch): Promise<Item> {
    return this.req<Item>(`/items/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  }

  deleteItems(ids: string[]): Promise<void> {
    return this.req<void>("/items", { method: "DELETE", body: JSON.stringify({ ids }) });
  }

  reprocessItem(id: string): Promise<Item> {
    return this.req<Item>(`/items/${id}/reprocess`, { method: "POST" });
  }

  retryExtraction(id: string): Promise<Item> {
    return this.req<Item>(`/items/${id}/retry-extraction`, { method: "POST" });
  }

  attentionCount(): Promise<AttentionCount> {
    return this.req<AttentionCount>("/items/attention-count");
  }

  relatedItems(id: string, limit = 5): Promise<Item[]> {
    return this.req<Item[]>(`/items/${id}/related${qs({ limit })}`);
  }

  search(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    return this.req<SearchResult[]>(`/search${qs({ q: query, mode: filters.mode })}`, {
      method: "POST",
      body: JSON.stringify(filters),
    });
  }

  recentQueries(): Promise<string[]> {
    return this.req<string[]>("/search/recent");
  }

  listCollections(): Promise<Collection[]> {
    return this.req<Collection[]>("/collections");
  }

  createCollection(name: string, description?: string): Promise<Collection> {
    return this.req<Collection>("/collections", { method: "POST", body: JSON.stringify({ name, description }) });
  }

  getCollection(id: string): Promise<Collection> {
    return this.req<Collection>(`/collections/${id}`);
  }

  patchCollection(id: string, patch: CollectionPatch): Promise<Collection> {
    return this.req<Collection>(`/collections/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  }

  deleteCollection(id: string): Promise<void> {
    return this.req<void>(`/collections/${id}`, { method: "DELETE" });
  }

  addToCollection(itemIds: string[], collectionId: string): Promise<void> {
    return this.req<void>(`/collections/${collectionId}/items`, { method: "POST", body: JSON.stringify({ itemIds }) });
  }

  removeFromCollection(itemIds: string[], collectionId: string): Promise<void> {
    return this.req<void>(`/collections/${collectionId}/items`, { method: "DELETE", body: JSON.stringify({ itemIds }) });
  }

  listTags(): Promise<Tag[]> {
    return this.req<Tag[]>("/tags");
  }

  renameTag(id: string, name: string): Promise<Tag> {
    return this.req<Tag>(`/tags/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
  }

  mergeTags(sourceIds: string[], targetId: string): Promise<Tag> {
    return this.req<Tag>("/tags/merge", { method: "POST", body: JSON.stringify({ sourceIds, targetId }) });
  }

  deleteTag(id: string): Promise<void> {
    return this.req<void>(`/tags/${id}`, { method: "DELETE" });
  }

  getAiSettings(): Promise<AiSettings> {
    return this.req<AiSettings>("/settings/ai");
  }

  saveAiSettings(settings: Partial<AiSettings> & { apiKey?: string }): Promise<AiSettings> {
    return this.req<AiSettings>("/settings/ai", { method: "PUT", body: JSON.stringify(settings) });
  }

  testAiConnection(): Promise<{ ok: boolean; message?: string }> {
    return this.req<{ ok: boolean; message?: string }>("/settings/ai/test", { method: "POST" });
  }

  updateAccount(patch: { name?: string; password?: string }): Promise<void> {
    return this.req<void>("/account", { method: "PATCH", body: JSON.stringify(patch) });
  }

  deleteAccount(): Promise<void> {
    return this.req<void>("/account", { method: "DELETE" });
  }

  listApiTokens(): Promise<ApiToken[]> {
    return this.req<ApiToken[]>("/api-tokens");
  }

  createApiToken(name: string, expiresInDays?: number): Promise<{ token: ApiToken; secret: string }> {
    return this.req<{ token: ApiToken; secret: string }>("/api-tokens", {
      method: "POST",
      body: JSON.stringify({ name, expiresInDays }),
    });
  }

  revokeApiToken(id: string): Promise<void> {
    return this.req<void>(`/api-tokens/${id}`, { method: "DELETE" });
  }

  async exportData(options: ExportOptions): Promise<{ blob: Blob; filename: string }> {
    const headers: Record<string, string> = {};
    if (this.session) headers.Authorization = `Bearer ${this.session.token}`;
    const res = await fetch(`${this.baseUrl}/export`, {
      method: "POST",
      headers,
      body: JSON.stringify(options),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const blob = await res.blob();
    const ext = options.format === "markdown" ? "md" : "zip";
    return { blob, filename: `inbox-export.${ext}` };
  }

  usage(): Promise<UsageInfo> {
    return this.req<UsageInfo>("/usage");
  }
}
