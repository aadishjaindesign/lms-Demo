import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const students = mongoose.connection.collection("students");
  const student = await students.findOne({});
  
  if (!student) {
     console.error("No student found!");
     process.exit(1);
  }

  // Create token
  const token = jwt.sign({ id: student._id, role: "student" }, process.env.JWT_SECRET || "default_secret", { expiresIn: "1d" });
  
  const courseId = "6a966ad560c263386f9ed691";
  const videoId = "6a9b9fb0fd5507981243c5b4";
  
  console.log("=== STEP 1: Fetch Master Playlist ===");
  const masterUrl = `http://localhost:5000/api/courses/${courseId}/videos/${videoId}/hls/master.m3u8`;
  console.log(`GET ${masterUrl}`);
  
  const masterRes = await fetch(masterUrl, {
    headers: { Cookie: `token=${token}; student_token=${token}` }
  });
  
  console.log(`Status: ${masterRes.status}`);
  console.log(`Content-Type: ${masterRes.headers.get("content-type")}`);
  const masterBody = await masterRes.text();
  console.log(`Body:\n${masterBody}`);
  
  if (masterRes.status !== 200) process.exit(1);

  // Extract first variant
  const variantLines = masterBody.split("\n").filter(l => l.trim().length > 0 && !l.startsWith("#"));
  if (variantLines.length === 0) {
     console.log("No variants found in master!");
     process.exit(1);
  }
  
  const variantPath = variantLines[0];
  console.log(`\n=== STEP 2: Fetch Variant Playlist ==="`);
  const variantUrl = `http://localhost:5000${variantPath}`;
  console.log(`GET ${variantUrl}`);
  
  const variantRes = await fetch(variantUrl, {
    headers: { Cookie: `token=${token}; student_token=${token}` }
  });
  
  console.log(`Status: ${variantRes.status}`);
  console.log(`Content-Type: ${variantRes.headers.get("content-type")}`);
  const variantBody = await variantRes.text();
  console.log(`Body excerpt:\n${variantBody.substring(0, 500)}...`);
  
  if (variantRes.status !== 200) process.exit(1);

  // Extract first segment
  const segmentLines = variantBody.split("\n").filter(l => l.trim().length > 0 && !l.startsWith("#"));
  if (segmentLines.length === 0) {
     console.log("No segments found in variant!");
     process.exit(1);
  }
  
  const segmentUrl = segmentLines[0];
  console.log(`\n=== STEP 3: Fetch Segment ===`);
  console.log(`GET ${segmentUrl}`);
  
  const segmentRes = await fetch(segmentUrl);
  console.log(`Status: ${segmentRes.status}`);
  console.log(`Content-Type: ${segmentRes.headers.get("content-type")}`);
  
  process.exit(0);
}
run();
