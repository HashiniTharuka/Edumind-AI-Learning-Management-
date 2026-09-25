import { describe, expect, it } from "vitest";
import { chunkText, cosineSimilarity } from "@/lib/ai/chunk";

describe("chunkText", () => {
  it("returns nothing for empty text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("keeps short text as a single chunk", () => {
    expect(chunkText("Hello world.")).toEqual(["Hello world."]);
  });

  it("never exceeds the max chunk size", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Paragraph ${i}. ${"Lorem ipsum dolor sit amet. ".repeat(8)}`).join("\n\n");
    const chunks = chunkText(text, 500, 100);
    expect(chunks.length).toBeGreaterThan(5);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(500);
  });

  it("covers all the source content", () => {
    const paragraphs = Array.from({ length: 30 }, (_, i) => `Unique marker ${i} with some filler text to pad it out.`);
    const chunks = chunkText(paragraphs.join("\n\n"), 300, 50).join(" ");
    for (let i = 0; i < 30; i++) expect(chunks).toContain(`Unique marker ${i} `);
  });

  it("splits a single huge paragraph on sentences and hard-cuts unbroken runs", () => {
    const sentences = "This is a sentence. ".repeat(200);
    expect(chunkText(sentences, 400).every((c) => c.length <= 400)).toBe(true);
    const noSpaces = "x".repeat(2500);
    const hard = chunkText(noSpaces, 1000);
    expect(hard.every((c) => c.length <= 1000)).toBe(true);
    expect(hard.join("")).toBe(noSpaces);
  });

  it("carries overlap between consecutive chunks", () => {
    const text = Array.from({ length: 10 }, (_, i) => `Section ${i}: ${"word ".repeat(40)}end${i}.`).join("\n\n");
    const chunks = chunkText(text, 500, 120);
    // The start of chunk n+1 should repeat text from the end of chunk n.
    const overlapFound = chunks.slice(1).some((c, i) => chunks[i].includes(c.slice(0, 20)));
    expect(overlapFound).toBe(true);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical direction and 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("handles zero vectors without NaN", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});
