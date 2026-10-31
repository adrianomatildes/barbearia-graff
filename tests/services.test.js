import { describe, it, expect } from 'vitest';
import { getShopConfig } from '../src/services/config.js';
import { listAvailability } from '../src/services/availability.js';
import { createAppointment } from '../src/services/appointments.js';
import { authenticateAdmin } from '../src/services/admin.js';
import { db } from '../src/db.js';

const seed = () => {
  const barbers = db.prepare('SELECT id FROM barbers WHERE active = 1 ORDER BY id LIMIT 1').get();
  const service = db.prepare('SELECT id FROM services WHERE active = 1 ORDER BY id LIMIT 1').get();
  return { barberId: barbers.id, serviceId: service.id };
};

const validDate = () => {
  const cfg = getShopConfig();
  const today = new Date().toISOString().slice(0, 10);
  return cfg.days.find((d) => d.date >= today)?.date ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

describe('Serviços do MVP', () => {
  it('retorna configuração da barbearia', () => {
    const cfg = getShopConfig();
    expect(cfg).toHaveProperty('services');
    expect(cfg).toHaveProperty('barbers');
    expect(cfg).toHaveProperty('days');
    expect(cfg).toHaveProperty('hours');
  });

  it('retorna slots de disponibilidade para um serviço', () => {
    const { barberId, serviceId } = seed();
    const date = validDate();
    const slots = listAvailability({ date, barberId, serviceId });
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty('start');
    expect(slots[0]).toHaveProperty('free');
  });

  it('cria um agendamento com dados válidos', () => {
    const { barberId, serviceId } = seed();
    const date = validDate();
    const slots = listAvailability({ date, barberId, serviceId });
    const start = slots.find((slot) => slot.free)?.start ?? 540;

    const result = createAppointment({
      serviceId,
      barberId,
      date,
      start,
      name: 'Cliente Teste',
      phone: '48999887766',
      type: 'avulso',
    });

    expect(result).toHaveProperty('id');
    expect(result.barber).toBeTruthy();
    expect(result.service).toBeTruthy();
  });

  it('autentica administrador válido', () => {
    const token = authenticateAdmin({ username: 'admin', password: '123456' });
    expect(token).toHaveProperty('token');
    expect(typeof token.token).toBe('string');
  });
});
