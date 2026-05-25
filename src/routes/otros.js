const express = require('express');
const { query, get, run } = require('../db/database');
const { authMiddleware, soloSupervisor, filtrarPorRol } = require('../middleware/auth');

const routerFacturas = express.Router();
const routerServicios = express.Router();
const routerReportes = express.Router();

routerFacturas.get('/', authMiddleware, (req, res) => {
  const asesorId = filtrarPorRol(req);
  let sql, params = [];
  if (asesorId) {
    sql = `SELECT f.*, c.nombre as cliente_nombre FROM facturas f
           JOIN clientes c ON f.cliente_id = c.id
           WHERE c.asesor_id = ? ORDER BY f.fecha_emision DESC`;
    params = [asesorId];
  } else {
    sql = `SELECT f.*, c.nombre as cliente_nombre FROM facturas f
           JOIN clientes c ON f.cliente_id = c.id
           ORDER BY f.fecha_emision DESC`;
  }
  res.json(query(sql, params));
});

routerFacturas.post('/', authMiddleware, (req, res) => {
  const { cliente_id, tramite_id, concepto, monto } = req.body;
  if (!cliente_id || !concepto || !monto)
    return res.status(400).json({ error: 'Cliente, concepto y monto requeridos' });
  const result = run(
    'INSERT INTO facturas (cliente_id, tramite_id, concepto, monto) VALUES (?, ?, ?, ?)',
    [cliente_id, tramite_id||null, concepto, monto]);
  res.status(201).json({ id: result.lastInsertRowid });
});

routerFacturas.put('/:id/pagar', authMiddleware, (req, res) => {
  run("UPDATE facturas SET estado='pagado', fecha_pago=datetime('now') WHERE id=?",
    [req.params.id]);
  res.json({ mensaje: 'Pago registrado' });
});

routerServicios.get('/', authMiddleware, (req, res) => {
  res.json(query('SELECT * FROM servicios_catalogo WHERE activo = 1 ORDER BY nombre'));
});

routerServicios.post('/', authMiddleware, soloSupervisor, (req, res) => {
  const { nombre, descripcion, precio_base } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const result = run(
    'INSERT INTO servicios_catalogo (nombre, descripcion, precio_base) VALUES (?, ?, ?)',
    [nombre, descripcion||null, precio_base||null]);
  res.status(201).json({ id: result.lastInsertRowid, nombre });
});

routerReportes.get('/resumen', authMiddleware, soloSupervisor, (req, res) => {
  const clientes = get('SELECT COUNT(*) as total FROM clientes WHERE activo = 1');
  const tramites = get("SELECT COUNT(*) as total FROM tramites WHERE estado NOT IN ('completado','cancelado')");
  const completados = get("SELECT COUNT(*) as total FROM tramites WHERE estado = 'completado'");
  const ingresos = get(`SELECT COALESCE(SUM(monto),0) as total FROM facturas
    WHERE estado='pagado' AND strftime('%Y-%m', fecha_pago) = strftime('%Y-%m', 'now')`);
  const pendiente = get("SELECT COALESCE(SUM(monto),0) as total FROM facturas WHERE estado='pendiente'");
  res.json({
    clientes_activos: clientes.total,
    tramites_en_curso: tramites.total,
    tramites_completados: completados.total,
    ingresos_mes_actual: ingresos.total,
    pendiente_cobro: pendiente.total
  });
});

routerReportes.get('/ingresos-mensuales', authMiddleware, soloSupervisor, (req, res) => {
  res.json(query(`SELECT strftime('%Y-%m', fecha_pago) as mes, SUM(monto) as total
    FROM facturas WHERE estado='pagado' GROUP BY mes ORDER BY mes DESC LIMIT 12`));
});

routerReportes.get('/servicios-populares', authMiddleware, (req, res) => {
  const asesorId = filtrarPorRol(req);
  let sql, params = [];
  if (asesorId) {
    sql = `SELECT s.nombre, COUNT(*) as cantidad FROM tramites t
           JOIN servicios_catalogo s ON t.servicio_id = s.id
           WHERE t.asesor_id = ? GROUP BY s.id ORDER BY cantidad DESC`;
    params = [asesorId];
  } else {
    sql = `SELECT s.nombre, COUNT(*) as cantidad FROM tramites t
           JOIN servicios_catalogo s ON t.servicio_id = s.id
           GROUP BY s.id ORDER BY cantidad DESC`;
  }
  res.json(query(sql, params));
});

module.exports = { routerFacturas, routerServicios, routerReportes };
