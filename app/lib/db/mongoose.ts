import mongoose from "mongoose";

/**
 * Singleton MongoDB connection.
 *
 * Why singleton?
 * - Next.js runs in a long-lived Node.js process in production.
 * - In development, hot-reload re-executes modules, which would create
 *   new connections on every file change without this guard.
 * - We cache the promise on `global` so it survives hot-reloads.
 */

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in .env.local"
  );
}

// Extend the NodeJS global type to hold our cached connection.
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

// Initialise the cache on the global object if it doesn't exist yet.
if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

const cache = global._mongooseCache;

export async function connectDB(): Promise<typeof mongoose> {
  // 1. Already connected — return immediately.
  if (cache.conn) {
    return cache.conn;
  }

  // 2. Connection in progress — wait for it instead of opening a second one.
  if (!cache.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false, // Fail fast if not connected; don't queue ops.
    };

    cache.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("✅ MongoDB connected");
      return mongooseInstance;
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    // Reset so the next request retries instead of hanging on a failed promise.
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}