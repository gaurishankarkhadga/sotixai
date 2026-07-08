const express = require('express');
const router = express.Router();
const EarlyAccess = require('../model/EarlyAccess');

// POST /api/earlyaccess/register
router.post('/register', async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, error: 'Name and email are required.' });
        }

        // Strict email validation to prevent fake/incomplete emails
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
        }

        // Check if already registered
        const existing = await EarlyAccess.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, error: 'This email is already registered for early access.' });
        }

        const newEntry = new EarlyAccess({ name, email });
        await newEntry.save();

        res.json({ success: true, message: 'Successfully registered for early access.' });
    } catch (error) {
        console.error('[EarlyAccess] Registration error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to register. Please try again later.' });
    }
});

module.exports = router;
