import "server-only";

/**
 * Minimal Gemini REST client (https://ai.google.dev/api). Using fetch directly keeps
 * the dependency footprint small and makes the API easy to mock in tests via GEMINI_BASE_URL.
 */

export const EMBEDDING_DIMENSIONS = 768;

const config = () => ({
  apiKey: process.env.GEMINI_API_KEY ?? "",
  baseUrl: process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta",
  chatModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001",
});

export function isAIConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export class AIError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

async function call(path: string, body: unknown, init?: { stream?: boolean }) {
  const { apiKey, baseUrl } = config();
  if (!apiKey) throw new AIError("AI features aren't configured (missing GEMINI_API_KEY).");

  const res = await fetch(`${baseUrl}/${path}${init?.stream ? "?alt=sse" : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`Gemini ${path} failed: ${res.status} ${detail.slice(0, 500)}`);
    throw new AIError(
      res.status === 429 ? "The AI is busy right now (free-tier rate limit). Try again in a minute." : "The AI request failed.",
      res.status
    );
  }
  return res;
}

export type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** Embeds many texts in batches of 100 (the API limit). */
export async function embedTexts(texts: string[], taskType: TaskType): Promise<number[][]> {
  const { embeddingModel } = config();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const res = await call(`models/${embeddingModel}:batchEmbedContents`, {
      requests: batch.map((text) => ({
        model: `models/${embeddingModel}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    });
    const json = (await res.json()) as { embeddings: { values: number[] }[] };
    out.push(...json.embeddings.map((e) => normalize(e.values)));
  }
  return out;
}

export async function embedQuery(text: string) {
  const [vector] = await embedTexts([text], "RETRIEVAL_QUERY");
  return vector;
}

/** Truncated embeddings (< 3072 dims) aren't unit length; normalizing makes cosine/dot scores comparable. */
function normalize(v: number[]) {
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

export type ChatTurn = { role: "user" | "model"; text: string };

type GenerateOptions = {
  system?: string;
  temperature?: number;
  /** When set, the model must return JSON matching this OpenAPI-style schema. */
  responseSchema?: object;
};

function generateBody(turns: ChatTurn[], opts: GenerateOptions) {
  return {
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    ...(opts.system && { systemInstruction: { parts: [{ text: opts.system }] } }),
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      ...(opts.responseSchema && { responseMimeType: "application/json", responseSchema: opts.responseSchema }),
    },
  };
}

type GenerateResponse = { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };

function textOf(json: GenerateResponse) {
  return (json.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
}

export async function generate(turns: ChatTurn[], opts: GenerateOptions = {}) {
  const res = await call(`models/${config().chatModel}:generateContent`, generateBody(turns, opts));
  return textOf((await res.json()) as GenerateResponse);
}

/** Streams generated text chunks using server-sent events. */
export async function* generateStream(turns: ChatTurn[], opts: GenerateOptions = {}) {
  const res = await call(`models/${config().chatModel}:streamGenerateContent`, generateBody(turns, opts), { stream: true });
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let boundary: number;
    while ((boundary = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 1);
      if (!line.startsWith("data:")) continue;
      const text = textOf(JSON.parse(line.slice(5)) as GenerateResponse);
      if (text) yield text;
    }
  }
}
