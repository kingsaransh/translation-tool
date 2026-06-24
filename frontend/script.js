// AetherTranslate - Client Logic
const getApiBase = () => {
    if (window.location.protocol === 'file:') {
        return 'http://localhost:5000';
    }
    const port = window.location.port;
    // Connect to backend port if served from standard frontend dev ports
    if (port && ['3000', '5173', '5500'].includes(port)) {
        return `http://${window.location.hostname}:5000`;
    }
    return ''; // Same origin (relative paths)
};
const API_BASE = getApiBase();

// Supported languages list with fallback name mappings
const LANGUAGES = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    ja: 'Japanese',
    zh: 'Chinese',
    pt: 'Portuguese',
    ru: 'Russian',
    ko: 'Korean',
    ar: 'Arabic',
    hi: 'Hindi',
    nl: 'Dutch',
    tr: 'Turkish'
};

// Language codes to locale identifiers mapping for Speech Synthesis (BCP-47)
const SPEECH_LOCALES = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    it: 'it-IT',
    ja: 'ja-JP',
    zh: 'zh-CN',
    pt: 'pt-PT',
    ru: 'ru-RU',
    ko: 'ko-KR',
    ar: 'ar-SA',
    hi: 'hi-IN',
    nl: 'nl-NL',
    tr: 'tr-TR'
};

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');
const sourceLangSelect = document.getElementById('source-lang');
const targetLangSelect = document.getElementById('target-lang');
const swapLangsBtn = document.getElementById('swap-langs');
const sourceText = document.getElementById('source-text');
const targetText = document.getElementById('target-text');
const charCountVal = document.getElementById('char-count-val');
const translateBtn = document.getElementById('translate-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const clearSourceBtn = document.getElementById('clear-source');
const copySourceBtn = document.getElementById('copy-source');
const copyTargetBtn = document.getElementById('copy-target');
const speakSourceBtn = document.getElementById('speak-source');
const speakTargetBtn = document.getElementById('speak-target');
const clearHistoryBtn = document.getElementById('clear-history');
const historyList = document.getElementById('history-list');
const toastContainer = document.getElementById('toast-container');

// State
let translationTimeout = null;
let isTranslating = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await loadLanguages();
    loadHistory();
    setupEventListeners();
    updateInputButtonsState();
});

// Theme Persistence
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);
}

function updateThemeIcons(theme) {
    if (theme === 'light') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcons(newTheme);
});

// Load Languages from Backend
async function loadLanguages() {
    try {
        const response = await fetch(`${API_BASE}/api/languages`);
        if (response.ok) {
            const languages = await response.json();
            populateLanguageDropdowns(languages);
            return;
        }
    } catch (err) {
        console.warn('Backend server offline or unreachable. Using fallback languages.');
    }
    populateLanguageDropdowns(LANGUAGES);
}

function populateLanguageDropdowns(langsList) {
    const prevSource = sourceLangSelect.value || 'en';
    const prevTarget = targetLangSelect.value || 'es';

    sourceLangSelect.innerHTML = '';
    targetLangSelect.innerHTML = '';

    Object.entries(langsList).forEach(([code, name]) => {
        const opt1 = new Option(name, code);
        const opt2 = new Option(name, code);
        sourceLangSelect.add(opt1);
        targetLangSelect.add(opt2);
    });

    sourceLangSelect.value = prevSource;
    targetLangSelect.value = prevTarget;
}

// Update state of buttons on the source container
function updateInputButtonsState() {
    const hasText = sourceText.value.trim().length > 0;
    clearSourceBtn.disabled = !hasText;
    speakSourceBtn.disabled = !hasText;
    copySourceBtn.disabled = !hasText;
}

// Setup Event Listeners
function setupEventListeners() {
    // Typing text handler with debounce
    sourceText.addEventListener('input', () => {
        const length = sourceText.value.length;
        charCountVal.textContent = length;
        
        updateInputButtonsState();

        if (length === 0) {
            targetText.value = '';
            toggleOutputButtons(false);
            return;
        }

        // Debounce translations (600ms)
        clearTimeout(translationTimeout);
        translationTimeout = setTimeout(() => {
            performTranslation();
        }, 600);
    });

    // Translate button click
    translateBtn.addEventListener('click', performTranslation);

    // Swap languages and text
    swapLangsBtn.addEventListener('click', () => {
        const src = sourceLangSelect.value;
        const tgt = targetLangSelect.value;
        
        sourceLangSelect.value = tgt;
        targetLangSelect.value = src;

        const currentSrcText = sourceText.value;
        const currentTgtText = targetText.value;

        sourceText.value = currentTgtText;
        targetText.value = currentSrcText;
        charCountVal.textContent = sourceText.value.length;

        updateInputButtonsState();

        if (sourceText.value) {
            performTranslation();
        }
    });

    // Clear input
    clearSourceBtn.addEventListener('click', () => {
        sourceText.value = '';
        targetText.value = '';
        charCountVal.textContent = '0';
        updateInputButtonsState();
        toggleOutputButtons(false);
        sourceText.focus();
    });

    // Copy handlers
    copySourceBtn.addEventListener('click', () => {
        copyToClipboard(sourceText.value, 'Source text copied to clipboard!');
    });

    copyTargetBtn.addEventListener('click', () => {
        copyToClipboard(targetText.value, 'Translation copied to clipboard!');
    });

    // Text to Speech handlers
    speakSourceBtn.addEventListener('click', () => {
        speakText(sourceText.value, sourceLangSelect.value);
    });

    speakTargetBtn.addEventListener('click', () => {
        speakText(targetText.value, targetLangSelect.value);
    });

    // Clear history list
    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('translation_history');
        loadHistory();
        showToast('History cleared.');
    });

    // Re-translate on language selection changes
    sourceLangSelect.addEventListener('change', () => {
        if (sourceText.value) performTranslation();
    });
    targetLangSelect.addEventListener('change', () => {
        if (sourceText.value) performTranslation();
    });
}

// Perform REST Call
async function performTranslation() {
    const text = sourceText.value;
    const source = sourceLangSelect.value;
    const target = targetLangSelect.value;

    if (!text || !text.trim()) {
        targetText.value = '';
        toggleOutputButtons(false);
        return;
    }

    if (isTranslating) return;
    
    setLoading(true);

    try {
        const response = await fetch(`${API_BASE}/api/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, source, target })
        });

        if (response.ok) {
            const data = await response.json();
            targetText.value = data.translatedText;
            toggleOutputButtons(true);
            saveToHistory(text, data.translatedText, source, target);
        } else {
            showToast('Failed to retrieve translation.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Cannot connect to translation server.', 'error');
    } finally {
        setLoading(false);
    }
}

function setLoading(loading) {
    isTranslating = loading;
    if (loading) {
        loadingIndicator.classList.add('active');
    } else {
        loadingIndicator.classList.remove('active');
    }
}

function toggleOutputButtons(active) {
    copyTargetBtn.disabled = !active;
    speakTargetBtn.disabled = !active;
}

// Copy Action
function copyToClipboard(text, successMsg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
    }).catch(err => {
        console.error('Clipboard copy failed:', err);
    });
}

// Voice Synthesis
function speakText(text, langCode) {
    if (!text || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel(); // Stop playing any current voice

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALES[langCode] || 'en-US';
    
    window.speechSynthesis.speak(utterance);
}

// Toast alerts
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span>${message}</span>
        <button style="background:none; border:none; color:inherit; font-size:12px; margin-left:10px; cursor:pointer;" onclick="this.parentElement.remove()">✕</button>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Local Storage History
function saveToHistory(sourceText, targetText, sourceLang, targetLang) {
    let history = JSON.parse(localStorage.getItem('translation_history')) || [];
    
    const isDuplicate = history.some(item => 
        item.sourceText === sourceText && 
        item.sourceLang === sourceLang && 
        item.targetLang === targetLang
    );

    if (isDuplicate) return;

    const newItem = {
        id: Date.now(),
        sourceText,
        targetText,
        sourceLang,
        targetLang
    };

    history.unshift(newItem);
    history = history.slice(0, 10); // Hold max 10 elements
    localStorage.setItem('translation_history', JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('translation_history')) || [];
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <p>Your recent translations will appear here</p>
            </div>
        `;
        return;
    }

    history.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'history-item';
        
        const srcName = LANGUAGES[item.sourceLang] || item.sourceLang.toUpperCase();
        const tgtName = LANGUAGES[item.targetLang] || item.targetLang.toUpperCase();

        itemEl.innerHTML = `
            <div class="history-item-langs">
                <span>${srcName}</span>
                <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
                <span>${tgtName}</span>
            </div>
            <div class="history-item-texts">
                <div class="history-text-src">${escapeHTML(item.sourceText)}</div>
                <div class="history-text-tgt">${escapeHTML(item.targetText)}</div>
            </div>
        `;

        itemEl.addEventListener('click', () => {
            sourceLangSelect.value = item.sourceLang;
            targetLangSelect.value = item.targetLang;
            sourceText.value = item.sourceText;
            targetText.value = item.targetText;
            charCountVal.textContent = item.sourceText.length;
            updateInputButtonsState();
            toggleOutputButtons(true);
            window.scrollTo({ top: sourceText.offsetTop - 50, behavior: 'smooth' });
        });

        historyList.appendChild(itemEl);
    });
}

function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}