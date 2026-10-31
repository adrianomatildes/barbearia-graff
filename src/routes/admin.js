import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  authenticateAdmin,
  listAppointmentsByDate,
  cancelAppointment,
  listSubscribers,
  saveSubscriber,
  deleteSubscriber,
  getMonthlyMetrics,
  listServices,
  createService,
  updateService,
  deleteService,
} from '../services/admin.js';

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
    type: z.enum(['plano', 'avulso']).optional(),
  }).parse(req.body);
  res.status(201).json(saveSubscriber(body));
});

adminRoutes.delete('/subscribers/:id', (req, res) => {
  deleteSubscriber(req.params.id);
  res.status(204).end();
});

adminRoutes.get('/metrics/monthly', (req, res) => {
  const { month } = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(req.query);
  res.json(getMonthlyMetrics(month));
});

adminRoutes.get('/clients', (req, res) => {
  const { type } = z.object({ type: z.enum(['plano', 'avulso']).optional() }).parse(req.query);
  const rows = db.prepare(`
    SELECT a.id, a.name, a.phone, a.type, a.date, a.start,
           s.name AS service,
           b.name AS barber
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    JOIN barbers b ON b.id = a.barber_id
    WHERE a.status = 'confirmed'
      ${type ? 'AND a.type = ?' : ''}
    ORDER BY a.date DESC, a.start DESC
  `).all(type ? [type] : []);
  res.json(rows);
});

adminRoutes.get('/services', (req, res) => {
  res.json(listServices());
});

adminRoutes.post('/services', (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2, 'Digite o nome do serviço.').max(80),
    price_cents: z.number().int().min(0),
    plan_price_cents: z.number().int().min(0),
    slots: z.number().int().min(1).max(8).default(1),
    active: z.boolean().optional(),
  }).parse(req.body);
  res.status(201).json(createService(body));
});

adminRoutes.put('/services/:id', (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2, 'Digite o nome do serviço.').max(80).optional(),
    price_cents: z.number().int().min(0).optional(),
    plan_price_cents: z.number().int().min(0).optional(),
    slots: z.number().int().min(1).max(8).optional(),
    active: z.boolean().optional(),
  }).parse(req.body);
  res.json(updateService(req.params.id, body));
});

adminRoutes.delete('/services/:id', (req, res) => {
  deleteService(req.params.id);
  res.status(204).end();
});
