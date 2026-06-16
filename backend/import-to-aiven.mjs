import mysql from 'mysql2/promise';
import fs from 'fs';

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

let sql = fs.readFileSync("u566035799_trogon (1).sql", 'utf8');

// Fix MariaDB-specific collation not supported by MySQL 8
sql = sql.replace(/utf8mb4_uca1400_ai_ci/g, 'utf8mb4_unicode_ci');
sql = sql.replace(/utf8mb4_uca1400_as_cs/g, 'utf8mb4_unicode_ci');
// Remove MariaDB-specific syntax
sql = sql.replace(/current_timestamp\(\) ON UPDATE current_timestamp\(\)/gi, 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
// Fix: MySQL 8 doesn't allow non-NULL defaults on TEXT/BLOB/LONGTEXT columns
// Convert longtext/text with non-NULL defaults to varchar
sql = sql.replace(/`role` longtext DEFAULT 'user'/g, "`role` varchar(50) DEFAULT 'user'");
sql = sql.replace(/`permissions` longtext DEFAULT NULL/g, '`permissions` text DEFAULT NULL');
// Generic: replace any longtext/text DEFAULT 'something' (non-null) with varchar(255)
sql = sql.replace(/\blongtext\b(\s+)DEFAULT\s+'([^']+)'/g, "varchar(255)$1DEFAULT '$2'");
sql = sql.replace(/\bmediumtext\b(\s+)DEFAULT\s+'([^']+)'/g, "varchar(500)$1DEFAULT '$2'");

// Disable strict mode and primary key requirement for import
await conn.query("SET SESSION sql_mode = ''");
await conn.query('SET SESSION sql_require_primary_key = 0');
await conn.query('SET FOREIGN_KEY_CHECKS = 0');

// Drop all existing tables
console.log('Dropping existing tables...');
const [tables] = await conn.query("SHOW TABLES");
for (const row of tables) {
  const tableName = Object.values(row)[0];
  await conn.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  console.log(`  Dropped: ${tableName}`);
}

console.log('Running import...');

const prefix = "SET SESSION sql_mode = '';\nSET SESSION sql_require_primary_key = 0;\nSET FOREIGN_KEY_CHECKS = 0;\n";

try {
  await conn.query(prefix + sql);
  console.log('Import successful!');
} catch (e) {
  console.error('Import error:', e.message);
}

await conn.end();
console.log('Done.');
