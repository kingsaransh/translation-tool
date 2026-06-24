require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { translateText, SUPPORTED_LANGUAGES } = require('./translationService');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON body
app.use(express.json());

// Serve static frontend files
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// API: Get supported languages
app.get('/api/languages', (req, res) => {
    res.json(SUPPORTED_LANGUAGES);
});

// API: Translate text
app.post('/api/translate', async (req, res) => {
    const { text, source, target } = req.body;

    if (!text || !source || !target) {
        return res.status(400).json({ error: 'Text, source, and target languages are required.' });
    }

    try {
        const translatedText = await translateText(text, source, target);
        res.json({ translatedText });
    } catch (err) {
        console.error('Translation error:', err);
        res.status(500).json({ error: 'Translation failed' });
    }
});

// Fallback to serve index.html for any other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  🌐 AetherTranslate Server Running!`);
    console.log(`  👉 http://localhost:${PORT}`);
    console.log(`==================================================`);
});