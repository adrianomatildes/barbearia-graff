import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

export const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const runSeed = () => {
  if (!db.prepare('SELECT 1 FROM services LIMIT 1').get()) {
    const ins = db.prepare('INSERT INTO services (name, price_cents, plan_price_cents, slots) VALUES (?,?,?,?)');
    ins.run('Corte', 4500, 0, 1);
    ins.run('Barba', 3500, 1750, 1);
    ins.run('Corte + barba', 7000, 1750, 2);
  }

  const barbers = db.prepare('SELECT id, name FROM barbers ORDER BY id').all();
  const felipeId = barbers.find((b) => b.name === 'Felipe')?.id;

  if (felipeId === undefined) {
    const firstId = barbers[0]?.id;
    if (firstId !== undefined) {
      db.prepare('UPDATE barbers SET name = ?, active = 1 WHERE id = ?').run('Felipe', firstId);
      db.prepare('UPDATE barbers SET active = 0 WHERE id != ?').run(firstId);
    } else {
      db.prepare('INSERT INTO barbers (name) VALUES (?)').run('Felipe');
    }
  } else {
    db.prepare('UPDATE barbers SET active = (id = ?) WHERE id IS NOT NULL').run(felipeId);
  }

  if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(config.adminUser, bcrypt.hashSync(config.adminPassword, 12));
  }
};

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  plan_price_cents INTEGER NOT NULL,
  slots INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS barbers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'plano' CHECK (type IN ('plano','avulso')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES barbers(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  date TEXT NOT NULL,
  start INTEGER NOT NULL,
  end INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('avulso','plano')),
  price_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  photo_url TEXT,
  hours TEXT NOT NULL DEFAULT 'Segunda a sábado · 08:00 às 18:00',
  slug TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS business_services (
  id INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_appt_lookup ON appointments (barber_id, date, status);
CREATE INDEX IF NOT EXISTS idx_business_city ON businesses (city, neighborhood, category, active);
CREATE INDEX IF NOT EXISTS idx_business_services_business ON business_services (business_id, active);
`);

const ensureSubscriberTypeColumn = () => {
  const columns = db.prepare('PRAGMA table_info(subscribers)').all();
  if (!columns.some((col) => col.name === 'type')) {
    db.exec("ALTER TABLE subscribers ADD COLUMN type TEXT NOT NULL DEFAULT 'plano' CHECK (type IN ('plano','avulso')); ");
  }
};

ensureSubscriberTypeColumn();

if (config.demoMode) {
  runSeed();
  const demoAppointments = db.prepare('SELECT 1 FROM appointments LIMIT 1').get();
  if (!demoAppointments) {
    const barber = db.prepare('SELECT id FROM barbers WHERE active = 1 ORDER BY id LIMIT 1').get();
    const service = db.prepare('SELECT id FROM services WHERE active = 1 ORDER BY id LIMIT 1').get();
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    db.prepare(`INSERT INTO appointments (barber_id, service_id, date, start, end, name, phone, type, price_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(barber.id, service.id, date, 540, 570, 'Cliente Demo', '48999999999', 'avulso', 4500);
  }
} else {
  runSeed();
}
