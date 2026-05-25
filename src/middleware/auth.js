const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'crm_asesoria_mercantil_secret_2026';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function soloSupervisor(req, res, next) {
  if (req.usuario.rol !== 'supervisor') {
    return res.status(403).json({ error: 'Acceso restringido a supervisores' });
  }
  next();
}

function filtrarPorRol(req) {
  if (req.usuario.rol === 'supervisor') return null;
  return req.usuario.id;
}

module.exports = { authMiddleware, soloSupervisor, filtrarPorRol };
