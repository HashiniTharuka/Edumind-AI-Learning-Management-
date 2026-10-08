import "server-only";
import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServerUri?: string | null;
};

// Reuse the connection across hot reloads in dev and across invocations in serverless.
const globalForMongoose = globalThis as unknown as { mongoose?: MongooseCache };
const cached: MongooseCache = globalForMongoose.mongoose ?? { conn: null, promise: null };
globalForMongoose.mongoose = cached;

async function resolveMongoUri(): Promise<string> {
  const uri = process.env.MONGODB_URI;
  if (uri && !uri.includes("<user>")) {
    return uri;
  }

  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    if (cached.memoryServerUri) return cached.memoryServerUri;
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const server = await MongoMemoryServer.create();
      const memUri = server.getUri();
      cached.memoryServerUri = memUri;
      console.log(`[EduMind] Running on local in-memory MongoDB: ${memUri}`);
      return memUri;
    } catch (e) {
      console.warn("[EduMind] Failed to auto-start MongoMemoryServer:", e);
    }
  }

  throw new Error("MONGODB_URI is not set. Add your Atlas connection string to .env.local");
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = await resolveMongoUri();

  cached.promise ??= mongoose.connect(uri, { bufferCommands: false, dbName: "edumind", serverSelectionTimeoutMS: 10_000 });

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
