const { Pool } = require('pg');
require('dotenv').config({ path: './api/.env' });

async function testConnection() {
    const pool = new Pool({
        host: process.env.PG_HOST || 'localhost',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'password',
        database: process.env.PG_DATABASE || 'wehub',
        port: process.env.PG_PORT || 5432,
    });

    try {
        const client = await pool.connect();
        console.log('Successfully connected to the database');
        const res = await client.query('SELECT current_database(), now()');
        console.log('Database:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
