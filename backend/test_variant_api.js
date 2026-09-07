import mongoose from "mongoose";
import dotenv from "dotenv";
import { getHlsVariantPlaylist } from "./src/controllers/videoController.js";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const req = {
    params: {
      courseId: "6a966ad560c263386f9ed691",
      videoId: "6a9b9fb0fd5507981243c5b4",
      rendition: "360p.m3u8"
    },
    user: { role: "admin" }
  };
  
  const res = {
    statusCode: null, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { console.log(`[API] Error:`, data); },
    setHeader(key, val) { this.headers[key] = val; },
    send(data) {
      console.log(`[API] Status: ${this.statusCode}`);
      console.log(`[API] Body:\n${data.substring(0, 500)}...`);
    }
  };

  await getHlsVariantPlaylist(req, res);
  process.exit(0);
}

runTest().catch(console.error);
