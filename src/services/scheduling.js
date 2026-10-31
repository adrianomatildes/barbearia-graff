import { config } from '../config.js';
import { db } from '../db.js';
import { HttpError } from '../middleware/errors.js';

const DAY_MS = 86_400_000;

/** Data e minutos atuais no fuso da barbearia. */
export function nowInShop() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

const toUtcNoon = (date) => new Date(`${date}T12:00:00Z`);
export const isOpenDay = (date) => toUtcNoon(date).getUTCDay() !== 0; // domingo fechado

/** Dias reservados disponíveis (seg–sáb) dentro da janela de agendamento. */
export function bookableDays() {
  const today = toUtcNoon(nowInShop().date);
  const days = [];
  for (let i = 0; i <= config.bookingWindowDays; i++) {
    const d = new Date(today.getTime() + i * DAY_MS);
    const date = d.toISOString().slice(0, 10);
    if (isOpenDay(date)) days.push({ date, weekday: d.getUTCDay() });
  }
  return days;
}

function assertBookableDate(date) {
  if (!bookableDays().some((d) => d.date === date)) {
    throw new HttpError(400, 'Data indisponível. Atendemos de segunda a sábado.');
  }
}

function getService(id) {
  const s = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(id);
  if (!s) throw new HttpError(404, 'Serviço não encontrado.');
  return s;
}

function getBarber(id) {
  const b = db.prepare('SELECT * FROM barbers WHERE id = ? AND active = 1').get(id);
  if (!b) throw new HttpError(404, 'Profissional não encontrado.');
  return b;
}

const hasConflict = (barberId, date, start, end) =>
  !!db.prepare(`SELECT 1 FROM appointments
    WHERE barber_id = ? AND date = ? AND status = 'confirmed' AND start < ? AND end > ? LIMIT 1`)
    .get(barberId, date, end, start);

export function getAvailability({ date, barberId, serviceId }) {
  assertBookableDate(date);
  getBarber(barberId);
  const service = getService(serviceId);
  const duration = service.slots * config.stepMinutes;
  const now = nowInShop();
  const slots = [];
  for (let start = config.openMinutes; start + duration <= config.closeMinutes; start += config.stepMinutes) {
    const past = date === now.date && start <= now.minutes;
    slots.push({ start, free: !past && !hasConflict(barberId, date, start, start + duration) });
  }
  return slots;
}

export function createAppointment({ serviceId, barberId, date, start, name, phone, type }) {
  assertBookableDate(date);
  const barber = getBarber(barberId);
  const service = getService(serviceId);
  const end = start + service.slots * config.stepMinutes;

  if (start < config.openMinutes || end > config.closeMinutes || start % config.stepMinutes !== 0) {
    throw new HttpError(400, 'Horário fora do funcionamento.');
  }
  const now = nowInShop();
  if (date === now.date && start <= now.minutes) throw new HttpError(400, 'Esse horário já passou.');

  // Transação IMMEDIATE: impede dois clientes de reservarem o mesmo horário ao mesmo tempo.
  const run = db.transaction(() => {
    if (type === 'plano' && !db.prepare('SELECT 1 FROM subscribers WHERE phone = ?').get(phone)) {
      throw new HttpError(403, 'Não encontramos este número no plano. Escolha “Avulso” ou fale com a barbearia.');
    }
    if (hasConflict(barber.id, date, start, end)) {
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
