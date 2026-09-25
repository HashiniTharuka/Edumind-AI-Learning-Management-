/**
 * Creates MongoDB indexes, including the two Atlas-only search indexes:
 *   - course_search       (Atlas Search)  → typo-tolerant catalog search
 *   - chunk_vector_index  (Vector Search) → retrieval for the AI tutor (RAG)
 *
 * Run: npm run setup:indexes   (safe to re-run; existing indexes are updated)
 */
import mongoose from "mongoose";
import { EMBEDDING_DIMENSIONS } from "../src/lib/ai/gemini";
import { SEARCH_INDEX } from "../src/lib/catalog";
import { VECTOR_INDEX } from "../src/lib/ai/rag";
import { ChatMessage } from "../src/models/ChatMessage";
import { ContentChunk } from "../src/models/ContentChunk";
import { Course } from "../src/models/Course";
import { Enrollment } from "../src/models/Enrollment";
import { Lesson } from "../src/models/Lesson";
import { Quiz, QuizAttempt } from "../src/models/Quiz";
import { Review } from "../src/models/Review";
import { User } from "../src/models/User";

const searchIndexes = [
  {
    collection: Course.collection.name,
    index: {
      name: SEARCH_INDEX,
      definition: {
        mappings: {
          dynamic: false,
          fields: {
            title: { type: "string" },
            subtitle: { type: "string" },
            description: { type: "string" },
            tags: { type: "string" },
            // "token" fields support exact-match filters (equals).
            status: { type: "token" },
            category: { type: "token" },
            level: { type: "token" },
          },
        },
      },
    },
  },
  {
    collection: ContentChunk.collection.name,
    index: {
      name: VECTOR_INDEX,
      type: "vectorSearch",
      definition: {
        fields: [
          { type: "vector", path: "embedding", numDimensions: EMBEDDING_DIMENSIONS, similarity: "cosine" },
          { type: "filter", path: "course" },
        ],
      },
    },
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<user>")) throw new Error("Set MONGODB_URI in .env.local first.");
  await mongoose.connect(uri, { dbName: "edumind" });
  const db = mongoose.connection.db!;

  console.log("• Syncing regular indexes…");
  for (const model of [User, Course, Lesson, Enrollment, Review, ContentChunk, Quiz, QuizAttempt, ChatMessage]) {
    await model.createCollection().catch(() => {}); // search indexes need the collection to exist
    await model.syncIndexes();
  }

  for (const { collection, index } of searchIndexes) {
    const coll = db.collection(collection);
    try {
      const existing = await coll.listSearchIndexes(index.name).toArray();
      if (existing.length) {
        await coll.updateSearchIndex(index.name, index.definition);
        console.log(`• Updated search index "${index.name}" on ${collection}`);
      } else {
        await coll.createSearchIndex(index);
        console.log(`• Created search index "${index.name}" on ${collection}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`! Could not create "${index.name}": ${message}`);
      console.warn("  Search indexes need MongoDB Atlas. The app falls back to basic search / in-app similarity without them.");
    }
  }

  console.log("\nDone. Atlas builds search indexes in the background (usually under a minute).");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
