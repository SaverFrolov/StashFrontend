import { z } from "zod";

export const itemTypeSchema = z.enum(["link", "text", "pdf", "docx", "audio"]);

export const itemStatusSchema = z.enum([
  "saved",
  "extracting",
  "annotating",
  "done",
  "partial",
  "extraction_failed",
  "ai_failed",
]);

export const fileRefSchema = z.object({
  name: z.string(),
  size: z.number(),
  mime: z.string(),
  url: z.string(),
});

export const processingStepSchema = z.object({
  name: z.enum(["extract", "annotate"]),
  status: z.enum(["pending", "running", "ok", "failed", "skipped"]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  error: z.string().optional(),
});

export const itemSchema = z.object({
  id: z.string(),
  type: itemTypeSchema,
  status: itemStatusSchema,
  title: z.string(),
  lang: z.string().optional(),
  capturedAt: z.string(),
  source: z.object({
    url: z.string().optional(),
    name: z.string().optional(),
    publishedAt: z.string().optional(),
  }),
  original: z.object({
    text: z.string().optional(),
    file: fileRefSchema.optional(),
  }),
  extracted: z.object({
    text: z.string().optional(),
    error: z.string().optional(),
  }),
  ai: z.object({
    annotation: z.string().optional(),
    tags: z.array(z.string()),
    model: z.string(),
    generatedAt: z.string().optional(),
    edited: z.boolean(),
  }),
  userComment: z.string().optional(),
  userTags: z.array(z.string()),
  suggestedTags: z.array(z.string()),
  collectionIds: z.array(z.string()),
  processing: z.array(processingStepSchema),
});

export const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  origin: z.enum(["user", "ai"]),
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export const sessionSchema = z.object({
  token: z.string(),
  user: userSchema,
});

export const apiTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  lastUsedAt: z.string().optional(),
});

export const aiSettingsSchema = z.object({
  provider: z.enum(["openai", "ollama"]),
  baseUrl: z.string(),
  model: z.string(),
  apiKeySet: z.boolean(),
  autoProcess: z.boolean(),
});

export const exportOptionsSchema = z.object({
  scope: z.enum(["all", "collection", "selected"]),
  collectionId: z.string().optional(),
  itemIds: z.array(z.string()).optional(),
  format: z.enum(["json", "markdown"]),
  includeOriginals: z.boolean(),
  includeExtracted: z.boolean(),
  includeAi: z.boolean(),
  includeComments: z.boolean(),
});

export type ItemDto = z.infer<typeof itemSchema>;
