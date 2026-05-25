const express = require('express');
const { query, get, run } = require('../db/database');
const { authMiddleware, filtrarPorRol } = require('../middleware/auth');

const router = express.Router();

router.get('/kanban', authMiddleware, (req, res) => {
  const asesorId = filtrarPorRol(req);
  let sql, params = [];
  if (asesorId) {
    sql = `SELECT t.*, c.nombre as cliente_nombre, s.nombre as servicio_nombre
           FROM tramites t JOIN clientes c ON t.cliente_id = c.id
           JOIN servicios_catalogo s ON t.servicio_id = s.id
           WHERE t.asesor_id = ? AND t.estado != 'cancelado'
           ORDER BY t.fecha_vencimiento ASC`;
    params = [asesorId];
  } else {
    sql = `SELECT t.*, c.nombre as cliente_nombre, s.nombre as servicio_nombre,
           u.nombre as asesor_nombre FROM tramites t
           JOIN clientes c ON t.cliente_id = c.id
           JOIN servicios_catalogo s ON t.servicio_id = s.id
           JOIN usuarios u ON t.asesor_id = u.id
           WHERE t.estado != 'cancelado' ORDER BY t.fecha_vencimiento ASC`;
  }
  const todos = query(sql, params);
  res.json({
    iniciado: todos.filter(t => t.estado === 'iniciado'),
    en_proceso: todos.filter(t => t.estado === 'en_proceso'),
    revision: todos.filter(t => t.estado === 'revision'),
    completado: todos.filter(t => t.estado === 'completado'),
  });
});

router.get('/alertas', authMiddleware, (req, res) => {
  const asesorId = filtrarPorRol(req);
  let sql, params = [];
  const base = `SELECT t.*, c.nombre as cliente_nombre, s.nombre as servicio_nombre,
    u.nombre as asesor_nombre,
    CAST(julianday(t.fecha_vencimiento) - julianday('now') AS INTEGER) as dias_restantes
    FROM tramites t JOIN clientes c ON t.cliente_id = c.id
    JOIN servicios_catalogo s ON t.servicio_id = s.id
    JOIN usuarios u ON t.asesor_id = u.id
    WHERE t.estado NOT IN ('completado','cancelado')
    AND t.fecha_vencimiento IS NOT NULL
    AND julianday(t.fecha_vencimiento) - julianday('now') <= 15`;
  if (asesorId) {
    sql = base + ' AND t.asesor_id = ? ORDER BY t.fecha_vencimiento ASC';
    params = [asesorId];
  } else {
    sql = base + ' ORDER BY t.fecha_vencimiento ASC';
  }
  res.json(query(sql, params));
});

router.get('/', authMiddleware, (req, res) => {
  const asesorId = filtrarPorRol(req);
  let where = ['1=1'], params = [];
  if (asesorId) { where.push('t.asesor_id = ?'); params.push(asesorId); }
  const sql = `SELECT t.*, c.nombre as cliente_nombre, s.nombre as servicio_nombre,
    u.nombre as asesor_nombre FROM tramites t
    JOIN clientes c ON t.cliente_id = c.id
    JOIN servicios_catalogo s ON t.servicio_id = s.id
    JOIN usuarios u ON t.asesor_id = u.id
    WHERE ${where.join(' AND ')} ORDER BY t.fecha_vencimiento ASC`;
  res.json(query(sql, params));
});

router.post('/', authMiddleware, (req, res) => {
  const { cliente_id, servicio_id, fecha_vencimiento, precio, notas } = req.body;
  if (!cliente_id || !servicio_id)
    return res.status(400).json({ error: 'Cliente y servicio requeridos' });
  const result = run
