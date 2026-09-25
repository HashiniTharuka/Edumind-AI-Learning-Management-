// A tiny stand-in for the Gemini REST API so E2E tests are free, fast and deterministic.
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const DIMS = 768;

/** Deterministic "embedding": hashed bag of words, so texts sharing words are similar. */
export function fakeEmbedding(text) {
  const v = new Array(DIMS).fill(0);
  for (const word of text.toLowerCase().match(/[a-z0-9$]+/g) ?? []) {
    if (word.length < 3) continue;
    const h = createHash("md5").update(word).digest();
    v[h.readUInt16BE(0) % DIMS] += 1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

const quizJson = () =>
  JSON.stringify({
    questions: Array.from({ length: 5 }, (_, i) => ({
      question: `Generated question number ${i + 1}?`,
      options: ["Alpha", "Beta", "Gamma", "Delta"],
      answerIndex: i % 4,
      explanation: `Because option ${i % 4} is right.`,
    })),
  });

export function startMockGemini() {
  const calls = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const json = body ? JSON.parse(body) : {};
      calls.push({ url: req.url, apiKey: req.headers["x-goog-api-key"], body: json });

      if (req.url.includes(":batchEmbedContents")) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ embeddings: json.requests.map((r) => ({ values: fakeEmbedding(r.content.parts[0].text) })) }));
        return;
      }
      if (req.url.includes(":streamGenerateContent")) {
        const system = json.systemInstruction?.parts?.[0]?.text ?? "";
        const excerpts = (system.match(/^\[\d+\] \(Lesson: /gm) ?? []).length;
        res.setHeader("Content-Type", "text/event-stream");
        const parts = ["MOCK_ANSWER ", `grounded in ${excerpts} excerpts `, "[1]."];
        for (const text of parts) {
          res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\r\n\r\n`);
        }
        res.end();
        return;
      }
      if (req.url.includes(":generateContent")) {
        res.setHeader("Content-Type", "application/json");
        const text = json.generationConfig?.responseSchema ? quizJson() : "MOCK_TEXT";
        res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
        return;
      }
      res.statusCode = 404;
      res.end("not found");
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}/v1beta`, calls, close: () => server.close() });
    });
  });
}
