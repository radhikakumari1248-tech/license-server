const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows parsing JSON from POST requests

// ==========================================
// DATABASE CONNECTION
// ==========================================
// Render will look for these variables in your "Environment" settings.
// If variables are missing, it falls back to 'mock-db' for safe testing.
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mock-db',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ==========================================
// 1. HOME ROUTE (Fixes "Cannot GET /")
// ==========================================
app.get('/', (req, res) => {
    res.status(200).send('✅ LeadShield License Server is Online & Running!');
});

// ==========================================
// 2. LICENSE VERIFICATION LOGIC
// ==========================================
// We use a shared function so both GET and POST work
async function checkLicense(key, res) {
    if (!key) {
        return res.status(400).json({ status: 'error', message: 'No license key provided' });
    }

    console.log(`🔍 Checking key: ${key}`);

    // --- MODE A: TEST MODE (If no DB is connected) ---
    if (!process.env.DB_HOST || process.env.DB_HOST === 'mock-db') {
        console.log("⚠️ Running in Test Mode (No Database Connected)");
        if (key === 'LSP-TEST-KEY' || key === 'LSP-642ACF55') {
            return res.json({
                status: 'active',
                expires: '2026-12-31',
                message: 'License Valid (Test Mode)',
                hardware_id: null
            });
        } else {
            return res.json({ status: 'invalid', message: 'Invalid Key (Test Mode)' });
        }
    }

    // --- MODE B: REAL DATABASE CHECK ---
    try {
        const [rows] = await pool.query('SELECT * FROM licenses WHERE license_key = ?', [key]);

        if (rows.length > 0) {
            const license = rows[0];

            // Check Expiry
            const today = new Date();
            const expiryDate = new Date(license.expiry_date);

            if (expiryDate < today) {
                return res.json({ status: 'expired', expires: license.expiry_date });
            }

            // License is Valid
            return res.json({
                status: 'active',
                expires: license.expiry_date,
                hardware_id: license.hardware_id || null
            });
        } else {
            return res.json({ status: 'invalid', message: 'Key not found in database' });
        }
    } catch (error) {
        console.error("❌ Database Error:", error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}

// ==========================================
// 3. API ROUTES
// ==========================================

// Handle GET requests (Browser / Simple Checks)
app.get('/verify', (req, res) => {
    const key = req.query.key || req.query.license_key;
    checkLicense(key, res);
});

// Handle POST requests (Secure / App Checks)
app.post('/verify', (req, res) => {
    const key = req.body.key || req.body.license_key;
    checkLicense(key, res);
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
