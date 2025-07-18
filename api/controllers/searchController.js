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

const SearchModel = require('../models/search');

/**
 * Provide search suggestions (placeholder)
 */
const getSuggestions = async (req, res) => {
  const hotelId = req.params.hotelId;
  const query = req.body.query;
  const searchTerm = query ? query.trim() : '';

  try {
    const rows = await SearchModel.findClientSuggestionsByHotelAndTerm(req.requestId, hotelId, searchTerm);

    const suggestions = rows.map(row => ({
      client_id: row.client_id,
      name: row.name,
      name_kana: row.name_kana,
      name_kanji: row.name_kanji,
      email: row.email,
      phone: row.phone,
      reservation_id: row.reservation_id,
      check_in: row.check_in,
      check_out: row.check_out,
      number_of_people: row.number_of_people,
    }));

    console.log(`[getSuggestions] DB results:`, suggestions);

    res.json({ suggestions });
  } catch (error) {
    console.error('[getSuggestions] Error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
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