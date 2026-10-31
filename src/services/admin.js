import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { HttpError } from '../middleware/errors.js';
import { signToken } from '../middleware/auth.js';

export function authenticateAdmin({ username, password }) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Usuário ou senha incorretos.');
  }
  return { token: signToken(user) };
}

export function listAppointmentsByDate(date) {
  return db.prepare(`
    SELECT a.id, a.start, a.end, a.name, a.phone, a.type, a.price_cents,
           b.name AS barber, s.name AS service
    FROM appointments a
    JOIN barbers b ON b.id = a.barber_id
    JOIN services s ON s.id = a.service_id
    WHERE a.date = ? AND a.status = 'confirmed'
    ORDER BY a.start, b.name`).all(date);
}

export function cancelAppointment(id) {
  const info = db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ? AND status = 'confirmed'")
    .run(Number(id));
  if (!info.changes) throw new HttpError(404, 'Agendamento não encontrado.');
}

export function listSubscribers() {
  return db.prepare('SELECT id, name, phone FROM subscribers ORDER BY name').all();
}

export function saveSubscriber({ name, phone }) {
  db.prepare('INSERT INTO subscribers (name, phone) VALUES (?, ?) ON CONFLICT(phone) DO UPDATE SET name = excluded.name')
    .run(name, phone);
  return { ok: true };
}

export function deleteSubscriber(id) {
  db.prepare('DELETE FROM subscribers WHERE id = ?').run(Number(id));
}
