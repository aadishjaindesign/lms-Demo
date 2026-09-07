import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const students = mongoose.connection.collection("students");
  const student = await students.findOne({});
  const accesses = mongoose.connection.collection("courseaccesses");
  await accesses.updateOne(
      { userId: student._id },
      { $set: { studentId: student._id, startDate: new Date(2020, 1, 1), expiryDate: new Date(2030, 1, 1) } }
  );
  console.log("Access updated for", student._id);
  process.exit(0);
}
run();
