import { config } from '../config.js';
import { db } from '../db.js';
import { HttpError } from '../middleware/errors.js';
import { nowInShop, bookableDays } from './scheduling.js';

export function assertBookableDate(date) {
  if (!bookableDays().some((d) => d.date === date)) {
    throw new HttpError(400, 'Data indisponível. Atendemos de segunda a sábado.');
  }
}

export function getService(id) {
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(id);
  if (!service) throw new HttpError(404, 'Serviço não encontrado.');
  return service;
}

export function getBarber(id) {
  const barber = db.prepare('SELECT * FROM barbers WHERE id = ? AND active = 1').get(id);
  if (!barber) throw new HttpError(404, 'Profissional não encontrado.');
  return barber;
}

export function listAvailability({ date, barberId, serviceId }) {
  assertBookableDate(date);
  getBarber(barberId);
  const service = getService(serviceId);
  const duration = service.slots * config.stepMinutes;
  const now = nowInShop();
  const slots = [];

  for (let start = config.openMinutes; start + duration <= config.closeMinutes; start += config.stepMinutes) {
    const past = date === now.date && start <= now.minutes;
    const hasConflict = !!db.prepare(`SELECT 1 FROM appointments
      WHERE barber_id = ? AND date = ? AND status = 'confirmed' AND start < ? AND end > ? LIMIT 1`)
      .get(barberId, date, start + duration, start);
    slots.push({ start, free: !past && !hasConflict });
  }

  return slots;
}
