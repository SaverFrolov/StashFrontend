export type ItemType = "link" | "text" | "pdf" | "docx" | "audio" | "video" | "xlsx";

export type ItemStatus =
  | "saved"
  | "extracting"
  | "annotating"
  | "done"
  | "partial"
  | "extraction_failed"
  | "ai_failed";

export interface SourceInfo {
  url?: string;
  name?: string;
  publishedAt?: string;
}

export interface FileRef {
  name: string;
  size: number;
  mime: string;
  url: string;
}

export interface ItemOriginal {
  text?: string;
  file?: FileRef;
}

export interface ItemExtracted {
  text?: string;
  error?: string;
}

export interface ItemAi {
  annotation?: string;
  tags: string[];
  model: string;
  generatedAt?: string;
  edited: boolean;
}

export interface ProcessingStep {
  name: "extract" | "annotate";
  status: "pending" | "running" | "ok" | "failed" | "skipped";
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface Item {
  id: string;
  type: ItemType;
  status: ItemStatus;
  title: string;
  lang?: string;
  capturedAt: string;
  source: SourceInfo;
  original: ItemOriginal;
  extracted: ItemExtracted;
  ai: ItemAi;
  userComment?: string;
  userTags: string[];
  suggestedTags: string[];
  collectionIds: string[];
  processing: ProcessingStep[];
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  origin: "user" | "ai";
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface ApiToken {
  id: string;
  name: string;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
}

export interface AiSettings {
  provider: "openai" | "ollama";
  baseUrl: string;
  model: string;
  apiKeySet: boolean;
  autoProcess: boolean;
}

export interface Page<T> {
  items: T[];
  hasMore: boolean;
  total: number;
}

export type SearchMode = "smart" | "keywords" | "meaning";

export interface SearchFilters {
  mode: SearchMode;
  types?: ItemType[];
  collectionIds?: string[];
  tagIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  statuses?: ItemStatus[];
}

export interface SearchResult {
  item: Item;
  snippet?: string;
  matchKind?: "keyword" | "meaning";
}

export interface SaveTextInput {
  text: string;
  comment?: string;
  collectionIds?: string[];
}

export interface SaveLinkInput {
  url: string;
  comment?: string;
  collectionIds?: string[];
}

/**
 * Platform-neutral file payload.
 * Web passes a data URL as `uri`; mobile passes content:// or file:// URIs.
 */
export interface FilePayload {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface SaveFileInput {
  file: FilePayload;
  comment?: string;
  collectionIds?: string[];
}

export interface SaveAudioInput {
  blob: FilePayload;
  durationMs: number;
  comment?: string;
}

export interface ItemPatch {
  title?: string;
  userComment?: string;
  aiAnnotation?: string;
  aiEdited?: boolean;
  restoreAi?: boolean;
  userTags?: string[];
  acceptSuggestedTag?: string;
  removeSuggestedTag?: string;
  collectionIds?: string[];
  lang?: string;
}

export interface CollectionPatch {
  name?: string;
  description?: string;
}

export interface ExportOptions {
  scope: "all" | "collection" | "selected";
  collectionId?: string;
  itemIds?: string[];
  format: "json" | "markdown";
  includeOriginals: boolean;
  includeExtracted: boolean;
  includeAi: boolean;
  includeComments: boolean;
}

export interface FeatureFlags {
  audio: boolean;
  semanticSearch: boolean;
  export: boolean;
}

export interface AttentionCount {
  count: number;
}

export interface UsageInfo {
  bytesUsed: number;
}


/** Neutral export payload: platforms wrap it themselves (Blob on web, file on mobile). */
export interface ExportResult {
  data: string;
  mime: string;
  filename: string;
}
