import { MongoClient } from "mongodb";
import { getEnv } from "@/config/env";
import { logger } from "@/lib/logger";

const SCOPE = "MongoDB";

// Cached on `global` (not a module-level variable) so the connection
// survives Next.js re-evaluating this module on every dev hot-reload, and
// so a warm serverless invocation in production reuses the same pool
// instead of opening a fresh one on every request - both are exactly what
// the MongoDB driver's own docs warn against doing.
declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Lazily connects to MongoDB and returns the client, or returns null when
 * MONGODB_URI isn't configured. MongoDB is optional infrastructure in this
 * app (a second, cross-instance tier for report caching) - the app has to
 * keep working without it, just without that specific performance benefit,
 * so this deliberately returns null instead of throwing the way a missing
 * required credential (Gemini, Finnhub) does in config/env.ts.
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  const { MONGODB_URI } = getEnv();
  if (!MONGODB_URI) return null;

  if (!global.__mongoClientPromise) {
    logger.info(SCOPE, "Opening connection");
    global.__mongoClientPromise = new MongoClient(MONGODB_URI)
      .connect()
      .then((client) => {
        logger.success(SCOPE, "Connected");
        return client;
      })
      .catch((error: unknown) => {
        logger.error(SCOPE, "Connection failed", { error });
        // Clear the cached promise so the NEXT call gets a fresh attempt
        // instead of permanently caching a rejected connection.
        global.__mongoClientPromise = undefined;
        throw error;
      });
  }

  return global.__mongoClientPromise;
}
