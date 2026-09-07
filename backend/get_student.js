import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection("users");
  const student = await users.findOne({ role: "student" });
  if (student) {
    console.log(`Email: ${student.email}`);
  } else {
    console.log("No student found");
  }
  process.exit(0);
}
run();
