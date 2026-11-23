import mongoose from 'mongoose';

let listenersAttached = false;

const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;
  const conn = mongoose.connection;
  conn.on('disconnected', () => console.warn('[MongoDB] ⚠ Disconnected — driver will auto-reconnect...'));
  conn.on('reconnected', () => console.log('[MongoDB] ✓ Reconnected'));
  conn.on('error', (err) => console.error('[MongoDB] Error:', err.message));
};

const connectToDatabase = async (attempt = 1) => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MongoDB Connection Error: Please define the MONGODB_URI environment variable');
    process.exit(1);
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  attachConnectionListeners();

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 2,
      // Give the driver time to re-elect/reconnect during a network blip
      // instead of failing requests with a 500 after 5s.
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
      family: 4, // Use IPv4, skip IPv6 resolution delays
    });
    console.log('MongoDB Connected');
    return mongoose.connection;
  } catch (error) {
    console.error(`MongoDB Connection Error (attempt ${attempt}):`, error.message);
    if (attempt >= 5) process.exit(1);
    const delay = Math.min(2000 * attempt, 10000);
    console.log(`[MongoDB] Retrying in ${delay / 1000}s...`);
    await new Promise((r) => setTimeout(r, delay));
    return connectToDatabase(attempt + 1);
  }
};

export default connectToDatabase;
