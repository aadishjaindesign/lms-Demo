import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection("users");
  const admin = await users.findOne({ role: "admin" });
  if (admin) {
    console.log(`Admin Email: ${admin.email}`);
  } else {
    console.log("No admin found");
  }
  process.exit(0);
}
run();
