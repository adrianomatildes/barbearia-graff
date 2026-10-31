import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, username: user.username }, config.jwtSecret, { expiresIn: '8h' });

export function requireAdmin(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
  }
}
