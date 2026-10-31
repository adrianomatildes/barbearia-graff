import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth.js';
import { authenticateAdmin, listAppointmentsByDate, cancelAppointment, listSubscribers, saveSubscriber, deleteSubscriber } from '../services/admin.js';

export const adminRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos.' },
});

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');
const phone = z.string().transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().min(10, 'Digite o WhatsApp com DDD.').max(13, 'Telefone inválido.'));

adminRoutes.post('/login', loginLimiter, (req, res) => {
  const { username, password } = z.object({ username: z.string().min(1), password: z.string().min(1) }).parse(req.body);
  res.json(authenticateAdmin({ username, password }));
});

adminRoutes.use(requireAdmin);

adminRoutes.get('/appointments', (req, res) => {
  const { date: filterDate } = z.object({ date }).parse(req.query);
  res.json(listAppointmentsByDate(filterDate));
});

adminRoutes.delete('/appointments/:id', (req, res) => {
  cancelAppointment(req.params.id);
  res.status(204).end();
});

adminRoutes.get('/subscribers', (req, res) => {
  res.json(listSubscribers());
});

adminRoutes.post('/subscribers', (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2, 'Digite o nome.').max(80),
    phone,
  }).parse(req.body);
  res.status(201).json(saveSubscriber(body));
});

adminRoutes.delete('/subscribers/:id', (req, res) => {
  deleteSubscriber(req.params.id);
  res.status(204).end();
});
