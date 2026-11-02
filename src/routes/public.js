import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { getShopConfig } from '../services/config.js';
import { listAvailability } from '../services/availability.js';
import { createAppointment } from '../services/appointments.js';
import {
  listBusinesses,
  getBusinessBySlug,
  getBusinessProfile,
  upsertBusinessProfile,
  listBusinessServices,
  createBusinessService,
  updateBusinessService,
  deleteBusinessService,
} from '../services/businesses.js';

export const publicRoutes = Router();

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');
const phone = z.string().transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().min(10, 'Digite o WhatsApp com DDD.').max(13, 'Telefone inválido.'));

const listClientAppointments = (req, res) => {
  const { phone: clientPhone } = z.object({ phone }).parse(req.query);
  const rows = db.prepare(`
    SELECT a.id, a.date, a.start, a.end, a.name, a.phone, a.type, a.price_cents,
           b.name AS barber,
           s.name AS service
    FROM appointments a
    JOIN barbers b ON b.id = a.barber_id
    JOIN services s ON s.id = a.service_id
    WHERE a.phone = ? AND a.status = 'confirmed'
    ORDER BY a.date DESC, a.start DESC
  `).all(clientPhone);
  res.json(rows);
};

publicRoutes.get('/config', (req, res) => {
  res.json(getShopConfig());
});

publicRoutes.get('/businesses', (req, res) => {
  const query = z.object({
    city: z.string().trim().optional(),
    neighborhood: z.string().trim().optional(),
    category: z.string().trim().optional(),
  }).parse(req.query);
  res.json(listBusinesses(query));
});

publicRoutes.get('/businesses/:slug', (req, res) => {
  res.json(getBusinessBySlug(req.params.slug));
});

publicRoutes.get('/business-profile', (req, res) => {
  res.json(getBusinessProfile());
});

publicRoutes.put('/business-profile', (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().min(10).max(500).optional(),
    city: z.string().trim().min(2).max(80).optional(),
    state: z.string().trim().min(2).max(40).optional(),
    neighborhood: z.string().trim().min(2).max(80).optional(),
    address: z.string().trim().min(5).max(200).optional(),
    phone: z.string().trim().min(8).max(30).optional(),
    whatsapp: z.string().trim().min(8).max(30).optional(),
    photo_url: z.string().trim().max(500).optional(),
    hours: z.string().trim().min(4).max(120).optional(),
    slug: z.string().trim().min(2).max(80).optional(),
  }).parse(req.body);
  res.json(upsertBusinessProfile(body));
});

publicRoutes.get('/business-services', (req, res) => {
  const { businessId } = z.object({ businessId: z.coerce.number().int().positive().optional() }).parse(req.query);
  const targetId = businessId ?? getBusinessProfile().id;
  res.json(listBusinessServices(targetId));
});

publicRoutes.post('/business-services', (req, res) => {
  const body = z.object({
    businessId: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(300).optional(),
    price_cents: z.number().int().min(0).optional(),
    duration_minutes: z.number().int().min(15).max(240).optional(),
  }).parse(req.body);
  const targetId = body.businessId ?? getBusinessProfile().id;
  res.status(201).json(createBusinessService(targetId, body));
});

publicRoutes.put('/business-services/:id', (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(300).optional(),
    price_cents: z.number().int().min(0).optional(),
    duration_minutes: z.number().int().min(15).max(240).optional(),
    active: z.boolean().optional(),
  }).parse(req.body);
  res.json(updateBusinessService(req.params.id, body));
});

publicRoutes.delete('/business-services/:id', (req, res) => {
  deleteBusinessService(req.params.id);
  res.status(204).end();
});

publicRoutes.get('/availability', (req, res) => {
  const q = z.object({
    date,
    barberId: z.coerce.number().int().positive(),
    serviceId: z.coerce.number().int().positive(),
  }).parse(req.query);
  res.json(listAvailability(q));
});

publicRoutes.get('/client/appointments', listClientAppointments);
publicRoutes.get('/clients/appointments', listClientAppointments);

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
