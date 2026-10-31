import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';

describe('API do MVP', () => {
  it('GET /health responde 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/config responde configuração pública', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('services');
    expect(res.body).toHaveProperty('barbers');
    expect(res.body).toHaveProperty('days');
  });

  it('POST /api/admin/login autentica com admin padrão', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});
