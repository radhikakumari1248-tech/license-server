const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// DATABASE CONNECTION
// ==========================================
// Render will look for these variables in your "Environment" settings.
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mock-db', // Fallback for testing
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==========================================
// LICENSE CHECK API
// ==========================================
app.get('/verify', async (req, res) => {
    const { key } = req.query;

    if (!key) {
        return res.status(400).json({ status: 'error', message: 'No license key provided' });
    }

    console.log(`Checking key: ${key}`);

    // ---------------------------------------------------------
    // OPTION 1: TEST MODE (Use this if you don't have a DB yet)
    // ---------------------------------------------------------
    // To use this, just don't set DB_HOST in Render yet.
    if (process.env.DB_HOST === 'mock-db' || !process.env.DB_HOST) {
        if (key === 'LSP-642ACF55') {
            return res.json({
                status: 'active',
                expires: '2026-12-31',
                message: 'License Valid (Test Mode)'
            });
        } else {
            return res.json({ status: 'invalid', message: 'Invalid Key (Test Mode)' });
        }
    }

    // ---------------------------------------------------------
    // OPTION 2: REAL DATABASE MODE
    // ---------------------------------------------------------
    try {
        const [rows] = await pool.query('SELECT * FROM licenses WHERE license_key = ?', [key]);

        if (rows.length > 0) {
            const license = rows[0];
            
            // Check if expired
            const today = new Date();
            const expiryDate = new Date(license.expiry_date);

            if (expiryDate < today) {
                return res.json({ status: 'expired', expires: license.expiry_date });
            }

            return res.json({
                status: 'active',
                expires: license.expiry_date,
                hardware_id: license.hardware_id
            });
        } else {
            return res.json({ status: 'invalid' });
        }
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`License Server running on port ${PORT}`);
});
