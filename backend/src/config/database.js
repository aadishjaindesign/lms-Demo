import mongoose from 'mongoose';

const connectToDatabase = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Please define the MONGODB_URI environment variable");
    
    await mongoose.connect(uri);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

export default connectToDatabase;
