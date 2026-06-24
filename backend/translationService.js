/**
 * Translation Service using MyMemory & Lingva Translation APIs with local fallback
 */

const francMin = require('franc-min');

const SUPPORTED_LANGUAGES = {
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

// Local mock translation database for offline/fallback when both APIs fail
const LOCAL_FALLBACKS = {
  'en-es': {
    'hello': 'hola',
    'world': 'mundo',
    'good morning': 'buenos días',
    'thank you': 'gracias',
    'how are you?': '¿cómo estás?',
    'goodbye': 'adiós',
    'yes': 'sí',
    'no': 'no',
    'please': 'por favor',
    'welcome': 'bienvenido'
  },
  'es-en': {
    'hola': 'hello',
    'mundo': 'world',
    'buenos días': 'good morning',
    'gracias': 'thank you',
    'cómo estás': 'how are you?',
    'adiós': 'goodbye',
    'sí': 'yes',
    'no': 'no',
    'por favor': 'please',
    'bienvenido': 'welcome'
  },
  'en-fr': {
    'hello': 'bonjour',
    'world': 'monde',
    'good morning': 'bonjour',
    'thank you': 'merci',
    'how are you?': 'comment ça va ?',
    'goodbye': 'au revoir',
    'yes': 'oui',
    'no': 'non',
    'please': 's\'il vous plaît',
    'welcome': 'bienvenue'
  },
  'fr-en': {
    'bonjour': 'hello',
    'monde': 'world',
    'merci': 'thank you',
    'comment ça va': 'how are you?',
    'au revoir': 'goodbye',
    'oui': 'yes',
    'non': 'no',
    's\'il vous plaît': 'please',
    'bienvenue': 'welcome'
  }
};

/**
 * Translate text from source language to target language
 * @param {string} text - Text to translate
 * @param {string} source - Source language code (e.g. 'en') or 'auto' for auto-detection
 * @param {string} target - Target language code (e.g. 'es')
 * @returns {Promise<string>} Translated text
 */
async function translateText(text, source, target) {
  if (!text || !text.trim()) {
    return '';
  }

  let detectedSource = source;

  // Auto-detect source language if needed
  if (source === 'auto') {
    try {
      detectedSource = francMin(text.trim());
      if (!detectedSource || detectedSource === 'und') {
        // Fallback to English if detection fails
        detectedSource = 'en';
      }
    } catch (error) {
      console.warn(`Language detection failed: ${error.message}, defaulting to English`);
      detectedSource = 'en';
    }
  }

  const cleanText = text.trim();
  const langPair = `${detectedSource.toLowerCase()}|${target.toLowerCase()}`;

  // 1. Try MyMemory Translation API (primary)
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${langPair}`;
    const response = await fetchWithTimeout(url, 4000);
    
    if (response.ok) {
      const data = await response.json();
      if (data.responseData && data.responseData.translatedText) {
        const result = data.responseData.translatedText;
        // Verify it didn't return a warning message/limit error
        if (!result.includes('MYMEMORY WARNING') && !result.includes('QUERY LIMIT EXCEEDED')) {
          return result;
        }
      }
    }
  } catch (error) {
    console.warn(`MyMemory API failed, trying Lingva API fallback: ${error.message}`);
  }

  // 2. Try Lingva API (Google Translate proxy fallback)
  try {
    const url = `https://lingva.ml/api/v1/${detectedSource}/${target}/${encodeURIComponent(cleanText)}`;
    const response = await fetchWithTimeout(url, 4000);
    
    if (response.ok) {
      const data = await response.json();
      if (data.translation) {
        return data.translation;
      }
    }
  } catch (error) {
    console.warn(`Lingva API failed, using local dictionary/fallback: ${error.message}`);
  }

  // 3. Fallback to local dictionary or original text
  return getLocalFallback(cleanText, detectedSource, target);
}

/**
 * Helper to fetch with timeout abort signal
 */
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function getLocalFallback(text, source, target) {
  const pairKey = `${source.toLowerCase()}-${target.toLowerCase()}`;
  const normalizedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
  
  const dict = LOCAL_FALLBACKS[pairKey];
  if (dict && dict[normalizedText]) {
    const translation = dict[normalizedText];
    if (text[0] === text[0].toUpperCase()) {
      return translation.charAt(0).toUpperCase() + translation.slice(1);
    }
    return translation;
  }
  
  // Clean fallback: return the original text if no match found
  return text;
}

module.exports = {
  translateText,
  SUPPORTED_LANGUAGES
};