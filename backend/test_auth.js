import mongoose from "mongoose";
import dotenv from "dotenv";
import { hasCourseAccess } from "./src/controllers/videoController.js";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const students = mongoose.connection.collection("students");
  const student = await students.findOne({});
  const courseId = "6a966ad560c263386f9ed691";

  const access = await hasCourseAccess(student._id.toString(), courseId);
  console.log("Access Check:", access);
  process.exit(0);
}
run();
