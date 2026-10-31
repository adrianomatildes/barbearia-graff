import { Router } from 'express';
import { z } from 'zod';
import { getShopConfig } from '../services/config.js';
import { listAvailability } from '../services/availability.js';
import { createAppointment } from '../services/appointments.js';

export const publicRoutes = Router();

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');
const phone = z.string().transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().min(10, 'Digite o WhatsApp com DDD.').max(13, 'Telefone inválido.'));

publicRoutes.get('/config', (req, res) => {
  res.json(getShopConfig());
});

publicRoutes.get('/availability', (req, res) => {
  const q = z.object({
    date,
    barberId: z.coerce.number().int().positive(),
    serviceId: z.coerce.number().int().positive(),
  }).parse(req.query);
  res.json(listAvailability(q));
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
