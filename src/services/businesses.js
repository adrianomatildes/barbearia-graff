import { db } from '../db.js';
import { HttpError } from '../middleware/errors.js';

const slugify = (value = '') => String(value)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'negocio';

const normalizeText = (value, label, minLength = 2) => {
  const raw = String(value ?? '').trim();
  if (raw.length < minLength) {
    throw new HttpError(400, `${label} inválido.`);
  }
  return raw;
};

export function listBusinesses({ city, neighborhood, category } = {}) {
  const clauses = ['b.active = 1'];
  const params = [];

  if (city) {
    clauses.push('LOWER(b.city) LIKE ?');
    params.push(`%${String(city).trim().toLowerCase()}%`);
  }

  if (neighborhood) {
    clauses.push('LOWER(b.neighborhood) LIKE ?');
    params.push(`%${String(neighborhood).trim().toLowerCase()}%`);
  }

  if (category) {
    clauses.push('LOWER(b.category) LIKE ?');
    params.push(`%${String(category).trim().toLowerCase()}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.prepare(`
    SELECT b.*
    FROM businesses b
    ${where}
    ORDER BY b.name ASC
  `).all(...params);
}

export function getBusinessBySlug(slug) {
  const row = db.prepare('SELECT * FROM businesses WHERE slug = ? AND active = 1 LIMIT 1').get(slug);
  if (!row) throw new HttpError(404, 'Negócio não encontrado.');
  return { ...row, services: db.prepare('SELECT * FROM business_services WHERE business_id = ? AND active = 1 ORDER BY name ASC').all(row.id) };
}

export function getBusinessProfile() {
  const business = db.prepare('SELECT * FROM businesses ORDER BY id ASC LIMIT 1').get();
  if (!business) throw new HttpError(404, 'Perfil do negócio não cadastrado.');
  return { ...business, services: db.prepare('SELECT * FROM business_services WHERE business_id = ? AND active = 1 ORDER BY name ASC').all(business.id) };
}

export function upsertBusinessProfile(payload = {}) {
  const business = db.prepare('SELECT * FROM businesses ORDER BY id ASC LIMIT 1').get();
  const name = normalizeText(payload.name ?? business?.name ?? 'Meu Negócio', 'Nome do negócio');
  const category = normalizeText(payload.category ?? business?.category ?? 'Geral', 'Categoria');
  const city = normalizeText(payload.city ?? business?.city ?? 'São Paulo', 'Cidade');
  const state = normalizeText(payload.state ?? business?.state ?? 'SP', 'Estado');
  const neighborhood = normalizeText(payload.neighborhood ?? business?.neighborhood ?? 'Centro', 'Bairro');
  const address = normalizeText(payload.address ?? business?.address ?? 'Endereço do estabelecimento', 'Endereço');
  const phone = normalizeText(payload.phone ?? business?.phone ?? '(11) 99999-0000', 'Telefone');
  const whatsapp = normalizeText(payload.whatsapp ?? business?.whatsapp ?? '(11) 99999-0000', 'WhatsApp');
  const description = normalizeText(payload.description ?? business?.description ?? 'Atendimento local com qualidade e agilidade.', 'Descrição');
  const hours = payload.hours ?? business?.hours ?? 'Segunda a sábado · 08:00 às 18:00';
  const photoUrl = payload.photo_url ?? business?.photo_url ?? '';
  const slug = payload.slug ?? business?.slug ?? slugify(name);

  if (business) {
    db.prepare(`
      UPDATE businesses
      SET name = ?, category = ?, description = ?, city = ?, state = ?, neighborhood = ?, address = ?, phone = ?, whatsapp = ?, photo_url = ?, hours = ?, slug = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, category, description, city, state, neighborhood, address, phone, whatsapp, photoUrl, hours, slug, business.id);
    return getBusinessProfile();
  }

  const result = db.prepare(`
    INSERT INTO businesses (name, category, description, city, state, neighborhood, address, phone, whatsapp, photo_url, hours, slug, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(name, category, description, city, state, neighborhood, address, phone, whatsapp, photoUrl, hours, slug);

  return db.prepare('SELECT * FROM businesses WHERE id = ?').get(result.lastInsertRowid);
}

export function listBusinessServices(businessId) {
  return db.prepare('SELECT * FROM business_services WHERE business_id = ? AND active = 1 ORDER BY name ASC').all(Number(businessId));
}

export function createBusinessService(businessId, payload = {}) {
  const name = normalizeText(payload.name, 'Nome do serviço');
  const description = String(payload.description ?? '').trim();
  const price = Number(payload.price_cents ?? 0);
  const duration = Number(payload.duration_minutes ?? 30);

  if (!Number.isFinite(price) || price < 0) throw new HttpError(400, 'Preço inválido.');
  if (!Number.isFinite(duration) || duration < 15) throw new HttpError(400, 'Duração inválida.');

  const result = db.prepare(`
    INSERT INTO business_services (business_id, name, description, price_cents, duration_minutes, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(Number(businessId), name, description, Math.round(price), Math.round(duration));

  return db.prepare('SELECT * FROM business_services WHERE id = ?').get(result.lastInsertRowid);
}

export function updateBusinessService(id, payload = {}) {
  const service = db.prepare('SELECT * FROM business_services WHERE id = ?').get(Number(id));
  if (!service) throw new HttpError(404, 'Serviço não encontrado.');

  const next = {
    name: normalizeText(payload.name ?? service.name, 'Nome do serviço'),
    description: String(payload.description ?? service.description ?? '').trim(),
    price_cents: Number(payload.price_cents ?? service.price_cents ?? 0),
    duration_minutes: Number(payload.duration_minutes ?? service.duration_minutes ?? 30),
    active: payload.active ?? service.active,
  };

  if (!Number.isFinite(next.price_cents) || next.price_cents < 0) throw new HttpError(400, 'Preço inválido.');
  if (!Number.isFinite(next.duration_minutes) || next.duration_minutes < 15) throw new HttpError(400, 'Duração inválida.');

  db.prepare(`
    UPDATE business_services
    SET name = ?, description = ?, price_cents = ?, duration_minutes = ?, active = ?
    WHERE id = ?
  `).run(next.name, next.description, Math.round(next.price_cents), Math.round(next.duration_minutes), Number(next.active), Number(id));

  return db.prepare('SELECT * FROM business_services WHERE id = ?').get(Number(id));
}

export function deleteBusinessService(id) {
  const info = db.prepare('UPDATE business_services SET active = 0 WHERE id = ?').run(Number(id));
  if (!info.changes) throw new HttpError(404, 'Serviço não encontrado.');
}
