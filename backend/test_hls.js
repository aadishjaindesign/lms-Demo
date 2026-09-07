import mongoose from "mongoose";
import dotenv from "dotenv";
import { getHlsMasterPlaylist, getHlsVariantPlaylist } from "./src/controllers/videoController.js";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const req = {
    params: {
      courseId: "6a966ad560c263386f9ed691",
      videoId: "6a9b9fb0fd5507981243c5b4",
    },
    user: {
      role: "admin" // admin bypasses course access check in controller
    }
  };
  
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      console.log(`[Master API] Status: ${this.statusCode}, Error:`, data);
    },
    setHeader(key, val) {
      this.headers[key] = val;
    },
    send(data) {
      this.body = data;
      console.log(`[Master API] Status: ${this.statusCode}, Headers:`, this.headers);
      console.log(`[Master API] Body:\n${data.substring(0, 300)}...`);
    }
  };

  await getHlsMasterPlaylist(req, res);
  
  if (res.statusCode === 200) {
     // Get variant
     const variantReq = {
       params: {
         courseId: "6a966ad560c263386f9ed691",
         videoId: "6a9b9fb0fd5507981243c5b4",
         rendition: "720p/playlist.m3u8"
       },
       user: { role: "admin" }
     };
     const variantRes = {
        statusCode: null, headers: {}, body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { console.log(`[Variant API] Status: ${this.statusCode}, Error:`, data); },
        setHeader(key, val) { this.headers[key] = val; },
        send(data) {
          console.log(`\n[Variant API] Status: ${this.statusCode}, Headers:`, this.headers);
          console.log(`[Variant API] Body:\n${data.substring(0, 300)}...`);
        }
     };
     await getHlsVariantPlaylist(variantReq, variantRes);
  }
  
  process.exit(0);
}

runTest().catch(console.error);
