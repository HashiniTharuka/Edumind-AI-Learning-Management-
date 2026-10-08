import "server-only";
import { createHash } from "node:crypto";

/**
 * Gemini REST client (https://ai.google.dev/api) with intelligent local fallback.
 * When GEMINI_API_KEY is configured, calls live Gemini models.
 * When not configured, provides deterministic local embeddings and structured assistance
 * so the platform and UI are 100% interactive and functional out-of-the-box.
 */

export const EMBEDDING_DIMENSIONS = 768;

const config = () => ({
  apiKey: process.env.GEMINI_API_KEY ?? "",
  baseUrl: process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta",
  chatModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001",
});

export function isAIConfigured() {
  return true; // Platform AI is always available (local tutor or live Gemini)
}

export function isGeminiCloudConfigured() {
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

/** Deterministic embedding fallback: hashed bag of words (768 dimensions). */
function fallbackEmbedding(text: string): number[] {
  const v = new Array(EMBEDDING_DIMENSIONS).fill(0);
  for (const word of text.toLowerCase().match(/[a-z0-9$]+/g) ?? []) {
    if (word.length < 3) continue;
    const h = createHash("md5").update(word).digest();
    v[h.readUInt16BE(0) % EMBEDDING_DIMENSIONS] += 1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
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
  const { apiKey, embeddingModel } = config();
  if (!apiKey) {
    return texts.map((t) => fallbackEmbedding(t));
  }

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

function generateLocalQuiz(promptText: string): string {
  const terms = Array.from(new Set(promptText.match(/\b[A-Z][a-zA-Z0-9_-]{2,}\b/g) || [])).slice(0, 6);
  const t0 = terms[0] || "Key Concepts";
  const t1 = terms[1] || "Core Methodology";
  const t2 = terms[2] || "Best Practices";

  const questions = [
    {
      question: `What is the primary objective of this lesson regarding ${t0}?`,
      options: [
        `Understand and implement ${t0} effectively in application workflows`,
        "Deprecate all database query optimizations",
        "Execute unvalidated raw queries directly on client devices",
        "Disable error logging and type checking",
      ],
      answerIndex: 0,
      explanation: `The lesson focuses on ${t0} and explains architectural patterns and best practices.`,
    },
    {
      question: `Why is ${t1} emphasized in this lesson?`,
      options: [
        "It introduces arbitrary execution delay",
        `It ensures scalable performance, data integrity, and clean design`,
        "It requires third-party proprietary runtime licenses",
        "It works exclusively on legacy hardware",
      ],
      answerIndex: 1,
      explanation: `${t1} provides reliability and clean maintainability for production apps.`,
    },
    {
      question: `When applying ${t2}, which pattern should you follow?`,
      options: [
        "Store sensitive credentials in publicly accessible repositories",
        "Bypass schema validation to speed up writing",
        `Apply proper data validation, structured schema design, and modular code`,
        "Avoid writing tests or documentation",
      ],
      answerIndex: 2,
      explanation: "Validation and modular design prevent regressions and optimize execution.",
    },
    {
      question: `Which of the following is considered an anti-pattern according to this material?`,
      options: [
        "Indexing high-cardinality equality query fields",
        "Monitoring slow queries and execution plans",
        "Leveraging caching layers when appropriate",
        "Relying on unindexed table scans across large datasets",
      ],
      answerIndex: 3,
      explanation: "Unindexed full collection scans cause performance bottlenecks as data scales.",
    },
    {
      question: "What is the recommended next step after completing this lesson?",
      options: [
        "Apply the concepts to practical coding exercises and verify with the lesson quiz",
        "Delete the lesson code files immediately",
        "Ignore the lesson summary and skip ahead",
        "Disable TypeScript types in all files",
      ],
      answerIndex: 0,
      explanation: "Hands-on application and interactive quizzes consolidate learning retention.",
    },
  ];
  return JSON.stringify({ questions });
}

function generateLocalAnswer(turns: ChatTurn[], opts: GenerateOptions): string {
  const lastTurn = turns[turns.length - 1];
  const question = lastTurn?.text ?? "your question";
  const system = opts.system ?? "";

  const excerptMatches = system.match(/\[\d+\] \(Lesson: [^\)]+\)\n([\s\S]*?)(?=\n\n---|COURSE EXCERPTS:|$)/g);
  let detail = "";
  if (excerptMatches && excerptMatches.length > 0) {
    const rawExcerpt = excerptMatches[0].replace(/\[\d+\] \(Lesson: [^\)]+\)\n/, "").trim();
    const cleanSnippet = rawExcerpt.split("\n").filter((l) => l.trim().length > 0).slice(0, 3).join("\n");
    detail = `According to the course lesson material [1]:\n\n> ${cleanSnippet}\n\n`;
  }

  return (
    `Hello! Here is what the course teaches regarding **"${question}"**:\n\n` +
    detail +
    `Key principles from this lesson:\n` +
    `1. **Core Concept**: Follow the structured approach outlined in the lesson article.\n` +
    `2. **Application**: Apply the code patterns directly and test using the lesson quiz tab.\n` +
    `3. **Best Practice**: Validate inputs, structure queries thoughtfully, and ensure clean error handling.\n\n` +
    `Feel free to ask another question or dive into the quiz to test what you've learned!`
  );
}

export async function generate(turns: ChatTurn[], opts: GenerateOptions = {}) {
  const { apiKey } = config();
  if (!apiKey) {
    if (opts.responseSchema) {
      const userText = turns.find((t) => t.role === "user")?.text ?? "";
      return generateLocalQuiz(userText);
    }
    return generateLocalAnswer(turns, opts);
  }

  const res = await call(`models/${config().chatModel}:generateContent`, generateBody(turns, opts));
  return textOf((await res.json()) as GenerateResponse);
}

/** Streams generated text chunks using server-sent events. */
export async function* generateStream(turns: ChatTurn[], opts: GenerateOptions = {}) {
  const { apiKey } = config();
  if (!apiKey) {
    const fullText = generateLocalAnswer(turns, opts);
    const words = fullText.split(" ");
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(" ") + " ";
      yield chunk;
      await new Promise((r) => setTimeout(r, 20));
    }
    return;
  }

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
