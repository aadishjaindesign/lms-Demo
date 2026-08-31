import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.warn("WARNING: Cloudinary credentials are not set in .env. Video uploads will fail.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'lms-videos',
    resource_type: 'video', // necessary for video uploads
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv'],
  },
});

export const upload = multer({ storage: storage });
export { cloudinary };
