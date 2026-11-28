// The institute runs on India time. Production servers default to UTC, which made a
// 12:30 PM punch get saved as "07:00 AM" and shifted "today" boundaries by 5h30m.
// Force IST for every Date in this process (this module is the first import in server.js).
process.env.TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: [
  path.join(__dirname, "../../.env.local"),
  path.join(__dirname, "../../.env")
], quiet: true });

const r2Vars = [
  'R2_BUCKET_NAME',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT'
];

const missingR2 = r2Vars.filter(v => !process.env[v]);
if (missingR2.length > 0) {
  console.warn(`⚠️  R2 storage not configured (missing: ${missingR2.join(', ')}). R2 video uploads will be disabled.`);
}
