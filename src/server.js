require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { getDb, get, run } = require('./db/database');

const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const clientesRoutes = require('./routes/clientes');
const tramitesRoutes = require('./routes/tramites');
const { routerFacturas, routerServicios, routerReportes } = require('./routes/otros');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/tramites', tramitesRoutes);
app.use('/api/facturas', routerFacturas);
app.use('/api/servicios', routerServicios);
app.use('/api/reportes', routerReportes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function crearSupervisorInicial() {
  const existe = get("SELECT id FROM usuarios WHERE email = 'supervisor@asesoria.com'");
  if (!existe) {
    const hash = await bcrypt.hash('Admin2026!', 10);
    run(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
      ['Supervisor', 'supervisor@asesoria.com', hash, 'supervisor']
    );
    console.log('Usuario supervisor creado.');
  }
}

async function start() {
  await getDb();
  await crearSupervisorInicial();
  app.listen(PORT, () => {
    console.log(`CRM corriendo en puerto ${PORT}`);
  });
}

start();
