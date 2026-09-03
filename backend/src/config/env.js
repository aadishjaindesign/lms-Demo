import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: [
  path.join(__dirname, "../../.env.local"),
  path.join(__dirname, "../../.env")
] });

const requiredVars = [
  'R2_BUCKET_NAME',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT'
];

for (const v of requiredVars) {
  if (!process.env[v]) {
    throw new Error(`${v} is missing from environment variables`);
  }
}
