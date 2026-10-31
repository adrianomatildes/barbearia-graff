import { config } from '../config.js';
import { db } from '../db.js';
import { HttpError } from '../middleware/errors.js';
import { nowInShop } from './scheduling.js';
import { getBarber, getService, assertBookableDate } from './availability.js';

export function createAppointment({ serviceId, barberId, date, start, name, phone, type }) {
  assertBookableDate(date);
  const barber = getBarber(barberId);
  const service = getService(serviceId);
  const end = start + service.slots * config.stepMinutes;

  if (start < config.openMinutes || end > config.closeMinutes || start % config.stepMinutes !== 0) {
    throw new HttpError(400, 'Horário fora do funcionamento.');
  }

  const now = nowInShop();
  if (date === now.date && start <= now.minutes) {
    throw new HttpError(400, 'Esse horário já passou.');
  }

  const run = db.transaction(() => {
    if (type === 'plano' && !db.prepare('SELECT 1 FROM subscribers WHERE phone = ?').get(phone)) {
      throw new HttpError(403, 'Não encontramos este número no plano. Escolha “Avulso” ou fale com a barbearia.');
    }

    const hasConflict = !!db.prepare(`SELECT 1 FROM appointments
      WHERE barber_id = ? AND date = ? AND status = 'confirmed' AND start < ? AND end > ? LIMIT 1`)
      .get(barberId, date, end, start);

    if (hasConflict) {
      throw new HttpError(409, 'Esse horário acabou de ser ocupado. Escolha outro.');
    }

    const price = type === 'plano' ? service.plan_price_cents : service.price_cents;
    const { lastInsertRowid } = db.prepare(`INSERT INTO appointments
      (barber_id, service_id, date, start, end, name, phone, type, price_cents)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(barber.id, service.id, date, start, end, name, phone, type, price);

    return { id: lastInsertRowid, date, start, end, name, type, price_cents: price, barber: barber.name, service: service.name };
  });

  return run.immediate();
}
