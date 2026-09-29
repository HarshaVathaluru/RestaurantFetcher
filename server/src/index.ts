import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import searchRoutes from './routes/searchRoutes';
import placesRoutes from './routes/placesRoutes';
import userRoutes from './routes/userRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());
app.use('/api', limiter);

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api', searchRoutes);
app.use('/api', placesRoutes);
app.use('/api', userRoutes);

import path from 'path';

// Serve frontend in production if built
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// Centralized Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

const HOST = '0.0.0.0';
app.listen(Number(PORT), HOST, () => {
  console.log(`✨ GourmetAI Server running on http://${HOST}:${PORT}`);
  console.log(`✨ Gemini AI Key active: ${!!process.env.GEMINI_API_KEY}`);
});

