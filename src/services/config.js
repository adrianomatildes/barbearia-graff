import { config } from '../config.js';
import { db } from '../db.js';
import { bookableDays } from './scheduling.js';

export function getShopConfig() {
  return {
    services: db.prepare('SELECT id, name, price_cents, plan_price_cents, slots FROM services WHERE active = 1').all(),
    barbers: db.prepare('SELECT id, name FROM barbers WHERE active = 1').all(),
    days: bookableDays(),
    hours: { open: config.openMinutes, close: config.closeMinutes, step: config.stepMinutes },
  };
}
