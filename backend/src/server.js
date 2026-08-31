import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectToDatabase from './config/database.js';

import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import studentPortalRoutes from './routes/studentPortalRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import videoRoutes from './routes/videoRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/student', studentPortalRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api', videoRoutes);

app.get('/', (req, res) => {
  res.send('LMS Backend API is running');
});

const startServer = async () => {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowing CORS for frontend: ${FRONTEND_URL}`);
  });
};

startServer();
