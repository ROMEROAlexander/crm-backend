const express = require('express');
const { query, get, run } = require('../db/database');
const { authMiddleware, filtrarPorRol } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const asesorId = filtrarPorRol(req);
  let sql, params;
  if (asesorId) {
    sql = `SELECT c.*, u.nombre as asesor_nombre FROM clientes c
           LEFT JOIN usuarios u ON c.asesor_id = u.id
           WHERE c.activo = 1 AND c.asesor_id = ? ORDER BY c.nombre`;
    params = [asesorId];
  } else {
    sql = `SELECT c.*, u.nombre as asesor_nombre FROM clientes c
           LEFT JOIN usuarios u ON c.asesor_id = u.id
           WHERE c.activo = 1 ORDER BY c.nombre`;
    params = [];
  }
  res.json(query(sql, params));
});

router.get('/:id', authMiddleware, (req, res) => {
  const asesorId = filtrarPorRol(req);
  const cliente = get(
    `SELECT c.*, u.nombre as asesor_nombre FROM clientes c
     LEFT JOIN usuarios u ON c.asesor_id = u.id
     WHERE c.id = ? AND c.activo = 1`, [req.params.id]);
  if (!cliente) return res.status(404).json({ error: 'No encontrado' });
  if (asesorId && cliente.asesor_id !== asesorId)
    return res.status(403).json({ error: 'Sin acceso' });
  const tramites = query(
    `SELECT t.*, s.nombre as servicio_nombre, u.nombre as asesor_nombre
     FROM tramites t JOIN servicios_catalogo s ON t.servicio_id = s.id
     JOIN usuarios u ON t.asesor_id = u.id
     WHERE t.cliente_id = ? ORDER BY t.created_at DESC`, [req.params.id]);
  res.json({ ...cliente, tramites });
});

router.post('/', authMiddleware, (req, res) => {
  const { nombre, tipo, nit, nrc, giro, telefono, email, municipio, notas, asesor_id } = req.body;
  if (!nombre || !nit || !tipo || !giro)
    return res.status(400).json({ error: 'Nombre, NIT, tipo y giro requeridos' });
  const existe = get('SELECT id FROM clientes WHERE nit = ?', [nit]);
  if (existe) return res.status(409).json({ error: 'Ya existe un cliente con ese NIT' });
  const asignadoA = req.usuario.rol === 'supervisor'
    ? (asesor_id || req.usuario.id) : req.usuario.id;
  const result = run(
    `INSERT INTO clientes (nombre, tipo, nit, nrc, giro, telefono, email, municipio, notas, asesor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, tipo, nit, nrc||null, giro, telefono||null, email||null,
     municipio||null, notas||null, asignadoA]);
  res.status(201).json(get('SELECT * FROM clientes WHERE id = ?', [result.lastInsertRowid]));
});

router.put('/:id', authMiddleware, (req, res) => {
  const asesorId = filtrarPorRol(req);
  const c = get('SELECT * FROM clientes WHERE id = ? AND activo = 1', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'No encontrado' });
  if (asesorId && c.asesor_id !== asesorId)
    return res.status(403).json({ error: 'Sin acceso' });
  const { nombre, tipo, nit, nrc, giro, telefono, email, municipio, notas, asesor_id } = req.body;
  const nuevoAsesor = req.usuario.rol === 'supervisor'
    ? (asesor_id || c.asesor_id) : c.asesor_id;
  run(`UPDA
