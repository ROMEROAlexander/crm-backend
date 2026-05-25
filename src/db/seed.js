const bcrypt = require('bcryptjs');

async function seed() {
  const { getDb, get, run } = require('./database');
  await getDb();

  const existe = get("SELECT id FROM usuarios WHERE email = 'supervisor@asesoria.com'");
  if (existe) {
    console.log('El supervisor ya existe.');
    process.exit(0);
  }

  const hash = await bcrypt.hash('Admin2026!', 10);
  run(
    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
    ['Supervisor', 'supervisor@asesoria.com', hash, 'supervisor']
  );

  console.log('Usuario supervisor creado.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
