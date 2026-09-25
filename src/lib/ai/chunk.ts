/**
 * Splits lesson text into overlapping chunks for embedding.
 * Prefers paragraph boundaries, then sentence boundaries, and only hard-cuts very long runs.
 */
export function chunkText(text: string, maxChars = 1200, overlap = 200): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  // Break into units that are each <= maxChars.
  const units: string[] = [];
  for (const para of clean.split(/\n\n+/)) {
    if (para.length <= maxChars) {
      units.push(para);
      continue;
    }
    const sentences = para.match(/[^.!?\n]+[.!?]*\s*|\n/g) ?? [para];
    let current = "";
    for (const sentence of sentences) {
      if ((current + sentence).length > maxChars && current) {
        units.push(current.trim());
        current = "";
      }
      if (sentence.length > maxChars) {
        for (let i = 0; i < sentence.length; i += maxChars) units.push(sentence.slice(i, i + maxChars).trim());
      } else {
        current += sentence;
      }
    }
    if (current.trim()) units.push(current.trim());
  }

  // Pack units into chunks, carrying a tail of the previous chunk forward as overlap.
  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      const tail = current.slice(-overlap);
      const tailStart = tail.search(/\s/);
      const carried = tailStart >= 0 ? tail.slice(tailStart + 1) : "";
      current = carried && carried.length + unit.length + 2 <= maxChars ? `${carried}\n\n${unit}` : unit;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}
