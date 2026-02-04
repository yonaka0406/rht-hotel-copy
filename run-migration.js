const { pool } = require('./api/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const migrationPath = path.join(__dirname, 'api', 'migrations', '028_add_account_type_indicators.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    console.log('Running migration...');
    await pool.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
