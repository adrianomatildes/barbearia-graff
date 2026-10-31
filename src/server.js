import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import './db.js';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';
import { errorHandler } from './middleware/errors.js';

const app = express();
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

app.use(express.static(publicDir, { extensions: ['html'] }));
app.use(errorHandler);

app.listen(config.port, () => console.log(`Barbearia rodando em http://localhost:${config.port}`));
