const get = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) throw new Error(`Variável de ambiente ausente: ${key}`);
  return value;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(get('PORT', 3000)),
  dbFile: get('DB_FILE', './data/barbearia.db'),
  tz: get('TZ_NAME', 'America/Sao_Paulo'),
  jwtSecret: get('JWT_SECRET'),
  adminUser: get('ADMIN_USER', 'admin'),
  adminPassword: get('ADMIN_PASSWORD'),
  openMinutes: 8 * 60,
  closeMinutes: 21 * 60,
  stepMinutes: 30,
  bookingWindowDays: 30,
};

if (config.env === 'production' && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET precisa ter ao menos 32 caracteres em produção.');
}
