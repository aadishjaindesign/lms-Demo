import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend root .env file if running locally
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the Admin model
import Admin from '../src/models/Admin.js';

const seedAdmin = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in environment variables.");
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be defined in environment variables.");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    // Check if the admin already exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`Admin with email ${adminEmail} already exists.`);
      console.log("Skipping creation to prevent duplicate or password overwrite.");
    } else {
      console.log(`Creating admin with email ${adminEmail}...`);
      
      // Hash the password securely
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      const newAdmin = new Admin({
        email: adminEmail,
        password: hashedPassword,
      });

      await newAdmin.save();
      console.log("Admin account successfully created!");
    }

    console.log("Disconnecting from MongoDB...");
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);

  } catch (error) {
    console.error("Error seeding admin:", error);
    // Ensure we disconnect on error
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

seedAdmin();
