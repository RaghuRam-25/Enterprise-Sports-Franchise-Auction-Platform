import mongoose from 'mongoose';
import { ENV } from './env.js';

// Cache mongoose connection across Vercel serverless invocations
// so we don't recreate connections on every cold start.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  try {
    // Use cached connection if already established
    if (cached.conn) return cached.conn;

    // If connection promise is already pending (concurrent requests), wait for it
    if (!cached.promise) {
      cached.promise = mongoose
        .connect(ENV.MONGO_URI, {
          // Serverless-friendly options:
          // - autoIndex: false prevents index creation on every model definition
          // - bufferCommands: false prevents connection queue buildup
          // - serverSelectionTimeoutMS & socketTimeoutMS for reliability
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          // strictQuery removed — not supported in Mongoose 8.x+
        })
        .then((conn) => {
          console.log(`[MongoDB Connected] Host: ${conn.connection.host}`);
          return conn;
        });
    }

    cached.conn = await cached.promise;
    cached.promise = null; // reset promise after success
    return cached.conn;
  } catch (error) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${ENV.MONGO_URI}: ${error.message}`);
    console.warn('[MongoDB Note] Backend will operate using in-memory state fallback if database is unavailable.');
    // Clear cached promise so next invocation retry
    cached.promise = null;
    throw error;
  }
};
