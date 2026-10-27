'use strict';
// Proteccion local para una sola instancia; para produccion multi-instancia usar un almacén compartido.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 10;
const MAX_KEYS = 10000;
const attempts = new Map();

module.exports = function visitorRateLimit(req, res, next) {
  const now = Date.now();
  if (attempts.size >= MAX_KEYS) {
    for (const [key, value] of attempts) {
      if (value.resetAt <= now) attempts.delete(key);
    }
    if (attempts.size >= MAX_KEYS) {
      return res.status(503).json({ success: false, message: 'Servicio temporalmente ocupado.' });
    }
  }
  // Express usa req.ip; no habilitar trust proxy sin configurar proxies confiables.
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const current = attempts.get(ip);
  const state = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + WINDOW_MS }
    : { count: current.count + 1, resetAt: current.resetAt };
  attempts.set(ip, state);
  if (state.count > MAX_REQUESTS) {
    res.set('Retry-After', String(Math.ceil((state.resetAt - now) / 1000)));
    return res.status(429).json({ success: false, message: 'Demasiados intentos. Intenta mas tarde.' });
  }
  return next();
};
