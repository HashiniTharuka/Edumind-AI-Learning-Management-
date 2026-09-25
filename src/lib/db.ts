import "server-only";
import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Reuse the connection across hot reloads in dev and across invocations in serverless.
const globalForMongoose = globalThis as unknown as { mongoose?: MongooseCache };
const cached: MongooseCache = globalForMongoose.mongoose ?? { conn: null, promise: null };
globalForMongoose.mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<user>")) {
    throw new Error("MONGODB_URI is not set. Add your Atlas connection string to .env.local");
  }

  cached.promise ??= mongoose.connect(uri, { bufferCommands: false, dbName: "edumind", serverSelectionTimeoutMS: 10_000 });

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
