/**
 * Convert text to different Japanese writing systems
 */
const convertTextEndpoint = async (req, res) => {
  try {
    const { text, to = 'hiragana' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Dynamic import of ES module
    const { convertText, convertToRomaji } = await import('../utils/japaneseUtils.mjs');
    
    let result;
    
    switch (to) {
      case 'hiragana':
        result = await convertText(text);
        break;
      case 'romaji':
        result = await convertToRomaji(text);
        break;
      default:
        return res.status(400).json({ error: 'Invalid conversion type. Use "hiragana" or "romaji"' });
    }

    res.json({ original: text, converted: result, to });
  } catch (error) {
    console.error('Error converting text:', error);
    res.status(500).json({ error: 'Text conversion failed' });
  }
};

/**
 * Generate phonetic variants for search matching
 */
const getPhoneticVariants = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Dynamic import of ES module
    const { convertText, convertToRomaji } = await import('../utils/japaneseUtils.mjs');
    
    const variants = new Set([text]);
    
    // Add hiragana variant if text contains kanji
    const kanjiRegex = /[一-龯]/;
    if (kanjiRegex.test(text)) {
      try {
        const hiraganaVariant = await convertText(text);
        variants.add(hiraganaVariant);
        
        // Add romaji variant
        const romajiVariant = await convertToRomaji(hiraganaVariant);
        variants.add(romajiVariant);
      } catch (error) {
        console.warn('Failed to convert kanji text:', error);
      }
    }
    
    // Add romaji variant for kana text
    const kanaRegex = /[ひ-ゖア-ヺ]/;
    if (kanaRegex.test(text)) {
      try {
        const romajiVariant = await convertToRomaji(text);
        variants.add(romajiVariant);
      } catch (error) {
        console.warn('Failed to convert kana to romaji:', error);
      }
    }

    res.json({ 
      original: text, 
      variants: Array.from(variants).filter(v => v && v !== text)
    });
  } catch (error) {
    console.error('Error generating phonetic variants:', error);
    res.status(500).json({ error: 'Failed to generate phonetic variants' });
  }
};

/**
 * Provide search suggestions (placeholder)
 */
const getSuggestions = async (req, res) => {
  try {
    // For now, return an empty array or simple suggestions
    res.json({ suggestions: [] });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
};

/**
 * Search for reservations (placeholder)
 */
const searchReservations = async (req, res) => {
  try {
    // For now, return an empty array
    res.json({ results: [] });
  } catch (error) {
    console.error('Error searching reservations:', error);
    res.status(500).json({ error: 'Failed to search reservations' });
  }
};

module.exports = {
  convertText: convertTextEndpoint,
  getPhoneticVariants,
  getSuggestions,
  searchReservations
};