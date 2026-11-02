import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { config } from './config.js';
import './db.js';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';
import { errorHandler } from './middleware/errors.js';

const app = express();
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const swaggerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'swagger.yaml');
const swaggerDocument = YAML.parse(fs.readFileSync(swaggerPath, 'utf8'));

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.get('/negocio/:slug', (req, res) => res.sendFile(path.join(publicDir, 'business.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

app.use(express.static(publicDir, { extensions: ['html'] }));
app.use(errorHandler);

export const startServer = (port = config.port) => app.listen(port, () => console.log(`Barbearia rodando em http://localhost:${port}`));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}

export { app };
