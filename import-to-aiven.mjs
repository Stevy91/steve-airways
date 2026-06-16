import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const SQL_FILE = path.join(process.cwd(), 'u566035799_trogon (1).sql');

const conn = await mysql.createConnection({
  host: 'mysql-39e03379-trogon.j.aivencloud.com',
  port: 12245,
  user: 'avnadmin',
  password: 'AVNS_n6SRfFhieDImu1FrwC1',
  database: 'defaultdb',
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
  connectTimeout: 30000,
});

console.log('Connected to Aiven MySQL');

const sql = fs.readFileSync(SQL_FILE, 'utf8');

// Split on statement boundaries to avoid memory issues
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

console.log(`Importing ${statements.length} statements...`);

let ok = 0, errors = 0;
for (const stmt of statements) {
  try {
    await conn.query(stmt + ';');
    ok++;
    if (ok % 50 === 0) console.log(`  ${ok}/${statements.length} done...`);
  } catch (e) {
    // Ignore duplicate/already exists errors
    if (!e.message.includes('already exists') && !e.message.includes('Duplicate')) {
      console.warn(`  Warning: ${e.message.substring(0, 80)}`);
      errors++;
    }
  }
}

await conn.end();
console.log(`\nDone! ${ok} statements imported, ${errors} errors.`);
