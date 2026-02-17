const express = require('express');
const cors = require('cors');
const fs = require('fs'); // Built-in module to read files

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// HOME ROUTE
// ==========================================
app.get('/', (req, res) => {
    res.status(200).send('✅ JSON License Server is Running!');
});

// ==========================================
// THE CHECK LOGIC
// ==========================================
function checkLicense(key, res) {
    console.log(`Checking key: ${key}`);

    // 1. Read the JSON file
    let licenses = [];
    try {
        const data = fs.readFileSync('licenses.json', 'utf8');
        licenses = JSON.parse(data);
    } catch (err) {
        console.error("Error reading license file:", err);
        return res.status(500).json({ status: 'error', message: 'Server Configuration Error' });
    }

    // 2. Find the key
    const foundLicense = licenses.find(item => item.key === key);

    if (foundLicense) {
        // Check Expiry
        const today = new Date();
        const expiryDate = new Date(foundLicense.expiry);

        if (expiryDate < today) {
            return res.json({ status: 'expired', expires: foundLicense.expiry });
        }

        // Check Status
        if (foundLicense.status !== 'active') {
            return res.json({ status: 'banned', message: 'License has been banned' });
        }

        // Success!
        return res.json({
            status: 'active',
            expires: foundLicense.expiry,
            hardware_id: foundLicense.hardware_id
        });
    } else {
        return res.json({ status: 'invalid', message: 'Key not found' });
    }
}

// ==========================================
// ROUTES
// ==========================================
app.get('/verify', (req, res) => {
    const key = req.query.key || req.query.license_key;
    checkLicense(key, res);
});

app.post('/verify', (req, res) => {
    const key = req.body.key || req.body.license_key;
    checkLicense(key, res);
});

// ==========================================
// START
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 JSON Server running on port ${PORT}`);
});
