import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const students = mongoose.connection.collection("students");
  const student = await students.findOne({});
  console.log(`Student Email: ${student.email}`);
  
  const admins = mongoose.connection.collection("admins");
  const admin = await admins.findOne({});
  console.log(`Admin Email: ${admin.email}`);
  process.exit(0);
}
run();
