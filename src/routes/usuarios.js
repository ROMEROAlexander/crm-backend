const express = require('express');
const bcrypt = require('bcryptjs');
const { query, get, run } = require('../db/database');
const { authMiddleware, soloSupervisor } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, soloSupervisor, (req, res) => {
  res.json(query('SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY nombre'));
});

router.post('/', authMiddleware, soloSupervisor, async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });

  const existe = get('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

  const hash = await bcrypt.hash(password, 10);
  const result = run(
    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, hash, rol || 'asesor']
  );

  res.status(201).json({ id: result.lastInsertRowid, nombre, email, rol: rol || 'asesor' });
});

router.put('/:id', authMiddleware, soloSupervisor, (req, res) => {
  const { nombre, email, rol, activo } = req.body;
  const u = get('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
  if (!u) return res.status(404).json({ error: 'No encontrado' });
  run('UPDATE usuarios SET nombre=?, email=?, rol=?, activo=? WHERE id=?',
    [nombre||u.nombre, email||u.email, rol||u.rol,
     activo!==undefined?activo:u.activo, req.params.id]);
  res.json({ mensaje: 'Usuario actualizado' });
});

module.exports = router;
