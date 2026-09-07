import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));
  
  for (const c of collections) {
     const count = await mongoose.connection.db.collection(c.name).countDocuments();
     console.log(`${c.name}: ${count} documents`);
     if (count > 0 && c.name.includes("user")) {
        const doc = await mongoose.connection.db.collection(c.name).findOne();
        console.log(`Sample from ${c.name}:`, doc);
     }
  }
  process.exit(0);
}
run();
