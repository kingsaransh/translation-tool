# 🌐 AetherTranslate

A premium, modern translation web application built with a responsive glassmorphic frontend and a standard Node.js Express backend.

---

## ✨ Features

- **Instant Translation**: Real-time translations using debounced API calls.
- **Dual Translation APIs**: Taps into MyMemory Translate API and falls back to Lingva (Google Translate proxy) for 100% translation uptime.
- **Glassmorphic Responsive Design**: Elegant, high-fidelity UI optimized for desktops, tablets, and smartphones.
- **Dynamic Dark/Light Themes**: Smooth transition animations with state persistence.
- **Voice Support**: High-quality Text-to-Speech (TTS) for both source and translated text.
- **Translation History**: Remembers your recent translations locally. Tap any card to reload it instantly.

---

## 📁 Project Structure

```
translation-tool/
├── backend/
│   ├── .env                # Local environment configuration file (port, defaults)
│   ├── .env.example        # Environment variables sample configuration
│   ├── index.js            # Node.js Express server serving static assets and REST endpoints
│   └── translationService.js # Translation utility using MyMemory & Lingva fallback
├── frontend/
│   ├── index.html          # Semantic HTML5 frontend interface
│   ├── style.css           # Premium CSS stylesheet with dynamic variables and animations
│   └── script.js           # Client-side routing, speech synthesis, & state management
├── package.json            # Project-level dependencies and launch scripts
└── README.md               # Documentation
```

---

## 🚀 How to Run

### 1. Install Dependencies
Open your terminal in the root folder (`translation-tool/`) and run:
```bash
npm install
```

### 2. Start the Server
Start the translation server by running:
```bash
npm start
```

The backend server will launch on port **`5000`** by default:
`🌐 AetherTranslate Server Running! http://localhost:5000`

### 3. Open the App
Navigate to **`http://localhost:5000`** in your browser. The Express backend automatically serves the static frontend assets from the `frontend/` folder.

---

## 🛠️ API Documentation

### 1. Supported Languages
- **Endpoint**: `/api/languages`
- **Method**: `GET`
- **Response**: JSON list of supported language code-to-name mapping.

### 2. Translate Text
- **Endpoint**: `/api/translate`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "text": "Hello, world!",
    "source": "en",
    "target": "es"
  }
  ```
- **Response**:
  ```json
  {
    "translatedText": "Hola, mundo!"
  }
  ```