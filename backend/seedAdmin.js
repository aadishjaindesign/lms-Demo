import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Missing MONGODB_URI');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const email = 'aadishjaindesign@gmail.com';
    const password = 'aadishjain';

    const hashedPassword = await bcrypt.hash(password, 10);

    let admin = await Admin.findOne({});
    
    if (admin) {
      // Update existing admin instead of keeping multiple
      admin.email = email;
      admin.password = hashedPassword;
      await admin.save();
      console.log('Existing admin updated to new credentials successfully');
    } else {
      await Admin.create({
        email,
        password: hashedPassword
      });
      console.log('Admin created successfully');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Failed to seed admin:', err);
    await mongoose.disconnect();
  }
};

seedAdmin();
