require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/database');

const email = 'root@wehub.com';
const newPassword = process.argv[2];

if (!newPassword) {
  console.error('Usage: node reset_root_password_db.js <new_password>');
  process.exit(1);
}

async function resetPassword() {
  const client = await pool.connect();
  try {
    // Check if pgcrypto extension exists
    const extRes = await client.query("SELECT * FROM pg_extension WHERE extname = 'pgcrypto'");
    if (extRes.rows.length === 0) {
      console.log('pgcrypto extension not found. Attempting to create it...');
      await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    }

    // Update password using pgcrypto's crypt function
    const query = `
      UPDATE users 
      SET 
        password_hash = crypt($1, gen_salt('bf')),
        updated_by = id -- Self-update
      WHERE email = $2
      RETURNING id, email, password_hash;
    `;

    const res = await client.query(query, [newPassword, email]);

    if (res.rows.length === 0) {
      console.log(`User ${email} not found.`);
    } else {
      console.log(`Password for ${email} updated successfully using pgcrypto.`);
      console.log('New Hash prefix:', res.rows[0].password_hash.substring(0, 10) + '...');
    }

  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    client.release();
    pool.end();
  }
}

resetPassword();

/*
UPDATE users
SET password_hash = crypt('NEW_PASSWORD', gen_salt('bf', 10))
WHERE id = 1;
*/
