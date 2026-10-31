import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAdmin, signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';

export const adminRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos.' },
});

adminRoutes.post('/login', loginLimiter, (req, res) => {
  const { username, password } = z.object({ username: z.string().min(1), password: z.string().min(1) }).parse(req.body);
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Usuário ou senha incorretos.');
  }
  res.json({ token: signToken(user) });
});

adminRoutes.use(requireAdmin);

adminRoutes.get('/appointments', (req, res) => {
  const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
  res.json(db.prepare(`
    SELECT a.id, a.start, a.end, a.name, a.phone, a.type, a.price_cents,
           b.name AS barber, s.name AS service
    FROM appointments a
    JOIN barbers b ON b.id = a.barber_id
    JOIN services s ON s.id = a.service_id
    WHERE a.date = ? AND a.status = 'confirmed'
    ORDER BY a.start, b.name`).all(date));
});

adminRoutes.delete('/appointments/:id', (req, res) => {
  const info = db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ? AND status = 'confirmed'")
    .run(Number(req.params.id));
  if (!info.changes) throw new HttpError(404, 'Agendamento não encontrado.');
  res.status(204).end();
});

adminRoutes.get('/subscribers', (req, res) => {
  res.json(db.prepare('SELECT id, name, phone FROM subscribers ORDER BY name').all());
});

adminRoutes.post('/subscribers', (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2, 'Digite o nome.').max(80),
    phone: z.string().transform((v) => v.replace(/\D/g, '')).pipe(z.string().min(10, 'Digite o WhatsApp com DDD.').max(13)),
  }).parse(req.body);
  db.prepare('INSERT INTO subscribers (name, phone) VALUES (?,?) ON CONFLICT(phone) DO UPDATE SET name = excluded.name')
    .run(body.name, body.phone);
  res.status(201).json({ ok: true });
});

adminRoutes.delete('/subscribers/:id', (req, res) => {
  db.prepare('DELETE FROM subscribers WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});
