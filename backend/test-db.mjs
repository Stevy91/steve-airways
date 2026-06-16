/**
 * Diagnostic script - run from Render shell:
 *   node backend/test-db.mjs
 */
import net from 'net';
import mysql from 'mysql2/promise';

const HOST = process.env.DB_HOST || 'mysql-39e03379-trogon.j.aivencloud.com';
const PORT = Number(process.env.DB_PORT) || 12245;
const USER = process.env.DB_USER || 'avnadmin';
const PASS = process.env.DB_PASSWORD;
const DB   = process.env.DB_NAME || 'defaultdb';

console.log('=== Aiven MySQL diagnostic ===');
console.log(`Host: ${HOST}:${PORT}`);
console.log(`User: ${USER}`);
console.log(`Password set: ${!!PASS}`);
console.log(`DB: ${DB}`);
console.log('');

// Step 1: raw TCP
console.log('Step 1: raw TCP connect...');
await new Promise((resolve) => {
  const sock = net.createConnection({ host: HOST, port: PORT }, () => {
    console.log('  ✅ TCP connected');
    sock.destroy();
    resolve();
  });
  sock.setTimeout(10000);
  sock.on('timeout', () => { console.log('  ❌ TCP timeout'); sock.destroy(); resolve(); });
  sock.on('error', (e) => { console.log('  ❌ TCP error:', e.message); resolve(); });
});

// Step 2: mysql2 createConnection (no pool) with SSL
console.log('\nStep 2: mysql2 createConnection (ssl: rejectUnauthorized:false)...');
try {
  const conn = await mysql.createConnection({
    host: HOST, port: PORT, user: USER, password: PASS, database: DB,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 15000,
  });
  const [rows] = await conn.query('SELECT VERSION() as v');
  console.log('  ✅ Connected! MySQL version:', rows[0].v);
  await conn.end();
} catch (e) {
  console.log('  ❌ Error:', e.message, '| code:', e.code);
}

// Step 3: mysql2 createConnection WITHOUT ssl
console.log('\nStep 3: mysql2 createConnection (no ssl)...');
try {
  const conn = await mysql.createConnection({
    host: HOST, port: PORT, user: USER, password: PASS, database: DB,
    connectTimeout: 15000,
  });
  const [rows] = await conn.query('SELECT VERSION() as v');
  console.log('  ✅ Connected! MySQL version:', rows[0].v);
  await conn.end();
} catch (e) {
  console.log('  ❌ Error:', e.message, '| code:', e.code);
}

// Step 4: pool with connectionLimit:1
console.log('\nStep 4: pool (connectionLimit:1, ssl)...');
try {
  const pool = mysql.createPool({
    host: HOST, port: PORT, user: USER, password: PASS, database: DB,
    ssl: { rejectUnauthorized: false },
    connectionLimit: 1,
    connectTimeout: 15000,
  });
  const [rows] = await pool.execute('SELECT 1 as ok');
  console.log('  ✅ Pool query OK:', rows[0]);
  await pool.end();
} catch (e) {
  console.log('  ❌ Error:', e.message, '| code:', e.code);
}

console.log('\n=== Done ===');
