const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/crm.db');
let db = null;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new SQL.Database();
  }
  initSchema();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('supervisor','asesor')),
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL,
      nit TEXT UNIQUE NOT NULL,
      nrc TEXT,
      giro TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      municipio TEXT,
      departamento TEXT DEFAULT 'La Unión',
      notas TEXT,
      activo INTEGER DEFAULT 1,
      asesor_id INTEGER REFERENCES usuarios(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS servicios_catalogo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio_base REAL,
      activo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS tramites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      servicio_id INTEGER NOT NULL REFERENCES servicios_catalogo(id),
      asesor_id INTEGER NOT NULL REFERENCES usuarios(id),
      estado TEXT NOT NULL DEFAULT 'iniciado',
      fecha_inicio TEXT DEFAULT (datetime('now')),
      fecha_vencimiento TEXT,
      fecha_completado TEXT,
      precio REAL,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS actividades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tramite_id INTEGER NOT NULL REFERENCES tramites(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      descripcion TEXT NOT NULL,
      tipo TEXT DEFAULT 'nota',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tramite_id INTEGER REFERENCES tramites(id),
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      concepto TEXT NOT NULL,
      monto REAL NOT NULL,
      estado TEXT DEFAULT 'pendiente',
      fecha_emision TEXT DEFAULT (datetime('now')),
      fecha_pago TEXT
    );
  `);
  const count = db.exec("SELECT COUNT(*) as c FROM servicios_catalogo")[0];
  if (count && count.values[0][0] === 0) {
    db.run(`
      INSERT INTO servicios_catalogo (nombre, precio_base) VALUES
      ('Matrícula de comercio nueva',150.00),
      ('Renovación de matrícula',85.00),
      ('Inscripción IVA',75.00),
      ('Asesoría fiscal',60.00),
      ('Legalización de libros contables',60.00),
      ('Constitución de sociedad',350.00),
      ('Facturación electrónica',120.00),
      ('Contabilidad mensual',120.00);
    `);
  }
  saveDb();
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0] };
}

function get(sql, params = []) {
  return query(sql, params)[0] || null;
}

module.exports = { getDb, query, run, get, saveDb };
