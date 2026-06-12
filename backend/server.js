import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import replayRoutes from './routes/replayRoutes.js';
import connectDB from './config/db.js';

dotenv.config();

const app = express();
const publicCors = cors();

function configuredReplayOrigins() {
  return (process.env.REPLAY_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function replayCorsOrigin(origin, callback) {
  if (!origin) {
    callback(null, false);
    return;
  }

  const allowedOrigins = configuredReplayOrigins();
  if (allowedOrigins.length === 0) {
    callback(Object.assign(new Error('Replay CORS origins are not configured.'), { statusCode: 503 }));
    return;
  }

  if (!allowedOrigins.includes(origin)) {
    callback(Object.assign(new Error('Origin is not allowed for replay artifacts.'), { statusCode: 403 }));
    return;
  }

  callback(null, origin);
}

const replayCors = cors({
  origin: replayCorsOrigin,
  methods: ['GET'],
  allowedHeaders: ['Authorization', 'Content-Type'],
});

function setReplayNoStore(req, res, next) {
  res.set('Cache-Control', 'no-store, private');
  res.set('Pragma', 'no-cache');
  res.set('Surrogate-Control', 'no-store');
  next();
}

// Connect to MongoDB (skip in test: tests provide their own in-memory connection)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/replay')) {
    setReplayNoStore(req, res, next);
    return;
  }

  publicCors(req, res, next);
});
app.use(express.json());

// Public health check (used by Docker healthcheck / load balancers).
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/replay', setReplayNoStore, replayCors, replayRoutes);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (req.path.startsWith('/api/replay')) {
    res.set('Cache-Control', 'no-store, private');
    res.set('Pragma', 'no-cache');
    res.set('Surrogate-Control', 'no-store');
  }

  const status = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  console.error('API request failed.', {
    method: req.method,
    path: req.originalUrl,
    status,
    message: err.message,
    userId: req.user?._id?.toString(),
    origin: req.get('origin'),
    ip: req.ip,
    stack: err.stack,
  });
  res.status(status).json({
    message: status >= 500 ? 'Internal server error.' : err.message,
  });
});

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
