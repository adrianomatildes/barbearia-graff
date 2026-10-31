import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { config } from '../config.js';
import { bookableDays, getAvailability, createAppointment } from '../services/scheduling.js';

export const publicRoutes = Router();

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');
const phone = z.string().transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().min(10, 'Digite o WhatsApp com DDD.').max(13, 'Telefone inválido.'));

publicRoutes.get('/config', (req, res) => {
  res.json({
    services: db.prepare('SELECT id, name, price_cents, plan_price_cents, slots FROM services WHERE active = 1').all(),
    barbers: db.prepare('SELECT id, name FROM barbers WHERE active = 1').all(),
    days: bookableDays(),
    hours: { open: config.openMinutes, close: config.closeMinutes, step: config.stepMinutes },
  });
});

publicRoutes.get('/availability', (req, res) => {
  const q = z.object({
    date,
    barberId: z.coerce.number().int().positive(),
    serviceId: z.coerce.number().int().positive(),
  }).parse(req.query);
  res.json(getAvailability(q));
});

publicRoutes.post('/appointments', (req, res) => {
  const body = z.object({
    serviceId: z.number().int().positive(),
    barberId: z.number().int().positive(),
    date,
    start: z.number().int().min(0).max(1440),
    name: z.string().trim().min(2, 'Digite seu nome.').max(80),
    phone,
    type: z.enum(['avulso', 'plano']),
  }).parse(req.body);
  res.status(201).json(createAppointment(body));
});
