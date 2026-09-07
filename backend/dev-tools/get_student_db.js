import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const students = mongoose.connection.collection("students");
  const doc = await students.findOne({});
  console.log("Student Doc keys:", Object.keys(doc));
  if (doc.email) console.log("Email:", doc.email);
  if (doc.contactEmail) console.log("ContactEmail:", doc.contactEmail);
  // let's print the whole doc if no email found
  if (!doc.email && !doc.contactEmail) console.log(doc);
  process.exit(0);
}
run();
