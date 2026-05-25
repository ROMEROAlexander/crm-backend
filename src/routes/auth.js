const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'crm_asesoria_mercantil_secret_2026';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const usuario = get('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email]);
  if (!usuario)
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  const valida = await bcrypt.compare(password, usuario.password_hash);
  if (!valida)
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
  });
});

router.get('/me', authMiddleware, (req, res) => {
  const usuario = get('SELECT id, nombre, email, rol FROM usuarios WHERE id = ?', [req.usuario.id]);
  if (!usuario) return res.status(404).json({ error: 'No encontrado' });
  res.json(usuario);
});

module.exports = router;
