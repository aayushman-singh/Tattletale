import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import connectDB from './config/db.js';

dotenv.config();

const app = express();

// Connect to MongoDB (skip in test: tests provide their own in-memory connection)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

// Start a listener everywhere EXCEPT Vercel's serverless runtime (which imports
// the default export) and tests (which drive `app` via supertest). Vercel sets
// VERCEL=1 automatically, so this listens for local dev and the docker image
// while staying serverless-friendly.
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// For Vercel deployment
export default app;
