/**
 * optionalAuth.js
 *
 * Decodifica el JWT si está presente y pone `req.user` disponible,
 * pero NO rechaza la request si falta o es inválido.
 *
 * Se usa para middlewares globales que necesitan el contexto del usuario
 * (ej: moduleGuard log-only) sin interferir con el flujo de autenticación
 * estándar que aplica cada ruta después.
 */

const jwt = require('jsonwebtoken');

module.exports = function optionalAuth(req, _res, next) {
    if (req.method === 'OPTIONS') return next();

    const token = req.header('x-auth-token');
    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // No sobrescribir si ya existe (ej: test harness)
        if (!req.user) req.user = decoded;
    } catch {
        // Token inválido / expirado → ignorar; la ruta real se encargará.
    }

    return next();
};
