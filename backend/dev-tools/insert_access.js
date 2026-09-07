import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const students = mongoose.connection.collection("students");
  const student = await students.findOne({});
  const accesses = mongoose.connection.collection("courseaccesses");
  await accesses.insertOne({
      userId: student._id,
      courseId: new mongoose.Types.ObjectId("6a993a2447b54817ae7f96ad"),
      accessGrantedAt: new Date(),
      status: "active"
  });
  console.log("Access inserted for", student._id);
  process.exit(0);
}
run();
