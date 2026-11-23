import https from 'https';
import http from 'http';
import mongoose from 'mongoose';

// Render free plan sleeps a service after 15 minutes without inbound traffic.
// We hit our own public URL well before that, so it never goes idle.
const SELF_PING_INTERVAL = 10 * 60 * 1000; // 10 min (< 15 min sleep window)
const RETRY_DELAY = 60 * 1000;             // on failure, retry after 1 min
const REQUEST_TIMEOUT = 30 * 1000;

const pingOnce = (url) =>
  new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { headers: { 'User-Agent': 'lms-keep-alive' } }, (res) => {
      res.resume(); // drain to free the socket
      res.statusCode < 500 ? resolve(res.statusCode) : reject(new Error(`HTTP ${res.statusCode}`));
    });
    req.setTimeout(REQUEST_TIMEOUT, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });

export const startKeepAlive = () => {
  // Render sets RENDER_EXTERNAL_URL automatically; SERVER_URL is a manual override.
  const serverUrl = (process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || '').replace(/\/$/, '');

  // 1. Keep MongoDB connection pool warm by pinging admin DB every 4 minutes
  const DB_PING_INTERVAL = 4 * 60 * 1000;
  setInterval(async () => {
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      }
    } catch (err) {
      // Silently ignore ping errors
    }
  }, DB_PING_INTERVAL);

  if (!serverUrl) {
    console.log('Keep-alive HTTP ping skipped: No RENDER_EXTERNAL_URL or SERVER_URL found in env.');
    return;
  }

  // 2. Self-ping the public URL so Render never sees 15 min of inactivity
  const healthUrl = `${serverUrl}/api/health`;

  const run = async () => {
    try {
      const status = await pingOnce(healthUrl);
      console.log(`[KEEP_ALIVE] ✓ ${healthUrl} → ${status}`);
    } catch (err) {
      console.warn(`[KEEP_ALIVE] ⚠ ping failed (${err.message}), retrying in ${RETRY_DELAY / 1000}s`);
      setTimeout(() => {
        pingOnce(healthUrl).catch((e) => console.error(`[KEEP_ALIVE] ✗ retry failed: ${e.message}`));
      }, RETRY_DELAY);
    }
  };

  setTimeout(run, 30 * 1000); // first ping shortly after boot
  setInterval(run, SELF_PING_INTERVAL);

  console.log(`[KEEP_ALIVE] Active: pinging ${healthUrl} every ${SELF_PING_INTERVAL / 60000} min (Render sleeps after 15 min idle).`);
};
