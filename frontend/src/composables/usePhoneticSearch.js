import { ref } from 'vue'

/**
 * Phonetic search composable for Japanese text processing
 * Provides hiragana/katakana conversion and flexible text matching
 * Automatically integrates with API when used in Vue components
 */
export function usePhoneticSearch() {
  const isLoading = ref(false)
  
  // Lazy-load API functionality when needed
  let apiCall = null
  let apiInitialized = false
  
  const initializeAPI = async () => {
    if (apiInitialized) return
    
    try {
      const { useApi } = await import('./useApi')
      const api = useApi()
      apiCall = api.apiCall
    } catch (error) {
      // API not available (e.g., in tests), use local functionality only
      console.debug('API not available, using local phonetic search only')
    }
    
    apiInitialized = true
  }

  // Character mapping tables for basic conversion
  const hiraganaToKatakanaMap = {
    'あ': 'ア', 'い': 'イ', 'う': 'ウ', 'え': 'エ', 'お': 'オ',
    'か': 'カ', 'き': 'キ', 'く': 'ク', 'け': 'ケ', 'こ': 'コ',
    'が': 'ガ', 'ぎ': 'ギ', 'ぐ': 'グ', 'げ': 'ゲ', 'ご': 'ゴ',
    'さ': 'サ', 'し': 'シ', 'す': 'ス', 'せ': 'セ', 'そ': 'ソ',
    'ざ': 'ザ', 'じ': 'ジ', 'ず': 'ズ', 'ぜ': 'ゼ', 'ぞ': 'ゾ',
    'た': 'タ', 'ち': 'チ', 'つ': 'ツ', 'て': 'テ', 'と': 'ト',
    'だ': 'ダ', 'ぢ': 'ヂ', 'づ': 'ヅ', 'で': 'デ', 'ど': 'ド',
    'な': 'ナ', 'に': 'ニ', 'ぬ': 'ヌ', 'ね': 'ネ', 'の': 'ノ',
    'は': 'ハ', 'ひ': 'ヒ', 'ふ': 'フ', 'へ': 'ヘ', 'ほ': 'ホ',
    'ば': 'バ', 'び': 'ビ', 'ぶ': 'ブ', 'べ': 'ベ', 'ぼ': 'ボ',
    'ぱ': 'パ', 'ぴ': 'ピ', 'ぷ': 'プ', 'ぺ': 'ペ', 'ぽ': 'ポ',
    'ま': 'マ', 'み': 'ミ', 'む': 'ム', 'め': 'メ', 'も': 'モ',
    'や': 'ヤ', 'ゆ': 'ユ', 'よ': 'ヨ',
    'ら': 'ラ', 'り': 'リ', 'る': 'ル', 'れ': 'レ', 'ろ': 'ロ',
    'わ': 'ワ', 'ゐ': 'ヰ', 'ゑ': 'ヱ', 'を': 'ヲ', 'ん': 'ン',
    'ゃ': 'ャ', 'ゅ': 'ュ', 'ょ': 'ョ',
    'っ': 'ッ', 'ー': 'ー'
  }

  const katakanaToHiraganaMap = Object.fromEntries(
    Object.entries(hiraganaToKatakanaMap).map(([k, v]) => [v, k])
  )

  /**
   * Convert hiragana text to katakana
   * @param {string} text - Text to convert
   * @returns {string} Converted text
   */
  function hiraganaToKatakana(text) {
    if (!text) return ''
    return text.split('').map(char => hiraganaToKatakanaMap[char] || char).join('')
  }

  /**
   * Convert katakana text to hiragana
   * @param {string} text - Text to convert
   * @returns {string} Converted text
   */
  function katakanaToHiragana(text) {
    if (!text) return ''
    return text.split('').map(char => katakanaToHiraganaMap[char] || char).join('')
  }

  /**
   * Basic romaji to kana conversion for common patterns
   * Handles multiple romaji variations (shi/si, chi/ti, tsu/tu, etc.)
   * @param {string} text - Romaji text to convert
   * @returns {string} Converted kana text
   */
  function romajiToKana(text) {
    if (!text) return ''
    
    const romajiMap = {
      // Basic vowels
      'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
      
      // K sounds
      'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
      'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
      
      // S sounds (with variations)
      'sa': 'さ', 'shi': 'し', 'si': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
      'za': 'ざ', 'ji': 'じ', 'zi': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
      
      // T sounds (with variations)
      'ta': 'た', 'chi': 'ち', 'ti': 'ち', 'tsu': 'つ', 'tu': 'つ', 'te': 'て', 'to': 'と',
      'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
      
      // N sounds
      'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
      
      // H sounds (with variations)
      'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'hu': 'ふ', 'he': 'へ', 'ho': 'ほ',
      'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
      'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
      
      // M sounds
      'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
      
      // Y sounds
      'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
      
      // R sounds (with L variations)
      'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
      'la': 'ら', 'li': 'り', 'lu': 'ル', 'le': 'れ', 'lo': 'ろ',
      
      // W sounds
      'wa': 'わ', 'wo': 'を',
      
      // N sound (standalone)
      'nn': 'ん', 'n': 'ん',
      
      // Common combinations with small tsu
      'kka': 'っか', 'kki': 'っき', 'kku': 'っく', 'kke': 'っけ', 'kko': 'っこ',
      'ssa': 'っさ', 'sshi': 'っし', 'ssi': 'っし', 'ssu': 'っす', 'sse': 'っせ', 'sso': 'っそ',
      'tta': 'った', 'tchi': 'っち', 'tti': 'っち', 'ttsu': 'っつ', 'ttu': 'っつ', 'tte': 'って', 'tto': 'っと',
      'ppa': 'っぱ', 'ppi': 'っぴ', 'ppu': 'っぷ', 'ppe': 'っぺ', 'ppo': 'っぽ'
    }

    let result = text.toLowerCase()
    
    // Sort by length (longest first) to handle multi-character mappings correctly
    const sortedKeys = Object.keys(romajiMap).sort((a, b) => b.length - a.length)
    
    for (const romaji of sortedKeys) {
      const regex = new RegExp(romaji, 'g')
      result = result.replace(regex, romajiMap[romaji])
    }
    
    return result
  }

  /**
   * Generate search variants for a given text
   * @param {string} text - Original text
   * @returns {string[]} Array of text variants
   */
  function generateSearchVariants(text) {
    if (!text) return []
    
    const variants = new Set([text])
    
    // Add hiragana variant
    const hiraganaVariant = katakanaToHiragana(text)
    if (hiraganaVariant !== text) {
      variants.add(hiraganaVariant)
    }
    
    // Add katakana variant
    const katakanaVariant = hiraganaToKatakana(text)
    if (katakanaVariant !== text) {
      variants.add(katakanaVariant)
    }
    
    // Add normalized version (remove spaces, full-width characters)
    const normalized = text
      .replace(/\s+/g, '')
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => 
        String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
      )
    
    if (normalized !== text) {
      variants.add(normalized)
      // Also add variants of the normalized text
      variants.add(katakanaToHiragana(normalized))
      variants.add(hiraganaToKatakana(normalized))
    }
    
    return Array.from(variants)
  }

  /**
   * Check if search term matches target text using phonetic matching
   * @param {string} searchTerm - Term to search for
   * @param {string} targetText - Text to search in
   * @returns {boolean} True if match found
   */
  function phoneticMatch(searchTerm, targetText) {
    if (!searchTerm || !targetText) return false
    
    const searchVariants = generateSearchVariants(searchTerm.toLowerCase())
    const targetVariants = generateSearchVariants(targetText.toLowerCase())
    
    // Also add romaji conversion for search term if it looks like romaji
    if (/^[a-zA-Z\s]+$/.test(searchTerm)) {
      const romajiConverted = romajiToKana(searchTerm.toLowerCase())
      if (romajiConverted !== searchTerm.toLowerCase()) {
        searchVariants.push(...generateSearchVariants(romajiConverted))
      }
    }
    
    // Check if any search variant matches any target variant
    for (const searchVariant of searchVariants) {
      for (const targetVariant of targetVariants) {
        if (targetVariant.includes(searchVariant) || searchVariant.includes(targetVariant)) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * Normalize phone number for consistent searching
   * @param {string} phone - Phone number to normalize
   * @returns {string} Normalized phone number
   */
  function normalizePhoneNumber(phone) {
    if (!phone) return ''
    
    return phone
      .replace(/[\s\-\(\)\+－]/g, '') // Remove spaces, hyphens, parentheses, plus (including full-width)
      .replace(/[０-９]/g, (char) => // Convert full-width numbers
        String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
      )
      .replace(/^81/, '') // Remove Japan country code
      .replace(/^0/, '') // Remove leading zero
  }

  /**
   * Normalize email address for consistent searching
   * @param {string} email - Email address to normalize
   * @returns {string} Normalized email address
   */
  function normalizeEmail(email) {
    if (!email) return ''
    
    return email
      .toLowerCase()
      .trim()
      .replace(/[Ａ-Ｚａ-ｚ０-９＠．]/g, (char) => // Convert full-width characters
        String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
      )
  }

  /**
   * Advanced phonetic matching with fuzzy search capability
   * @param {string} searchTerm - Term to search for
   * @param {string} targetText - Text to search in
   * @param {number} threshold - Similarity threshold (0-1)
   * @returns {boolean} True if match found
   */
  function fuzzyPhoneticMatch(searchTerm, targetText, threshold = 0.7) {
    if (!searchTerm || !targetText) return false
    
    // First try exact phonetic match
    if (phoneticMatch(searchTerm, targetText)) {
      return true
    }
    
    // Calculate similarity using simple character-based approach
    const searchVariants = generateSearchVariants(searchTerm.toLowerCase())
    const targetVariants = generateSearchVariants(targetText.toLowerCase())
    
    let maxSimilarity = 0
    
    for (const searchVariant of searchVariants) {
      for (const targetVariant of targetVariants) {
        const similarity = calculateSimilarity(searchVariant, targetVariant)
        maxSimilarity = Math.max(maxSimilarity, similarity)
      }
    }
    
    return maxSimilarity >= threshold
  }

  /**
   * Calculate similarity between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  function calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1
    if (!str1 || !str2) return 0
    
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1
    
    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  function levenshteinDistance(str1, str2) {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Convert text using backend API (for kanji conversion)
   * @param {string} text - Text to convert
   * @param {string} to - Target format ('hiragana' or 'romaji')
   * @returns {Promise<string>} Converted text
   */
  async function convertTextWithAPI(text, to = 'hiragana') {
    if (!text) return ''
    
    await initializeAPI()
    
    if (!apiCall) {
      console.warn('API not available, falling back to local conversion')
      return to === 'hiragana' ? katakanaToHiragana(text) : text
    }
    
    try {
      isLoading.value = true
      const response = await apiCall('/search/convert-text', 'POST', { text, to })
      return response.converted || text
    } catch (error) {
      console.warn('API text conversion failed, falling back to local conversion:', error)
      // Fallback to local conversion for basic cases
      if (to === 'hiragana') {
        return katakanaToHiragana(text)
      }
      return text
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get phonetic variants using backend API (for kanji handling)
   * @param {string} text - Text to get variants for
   * @returns {Promise<string[]>} Array of phonetic variants
   */
  async function getPhoneticVariantsWithAPI(text) {
    if (!text) return []
    
    await initializeAPI()
    
    if (!apiCall) {
      console.warn('API not available, falling back to local variants')
      return generateSearchVariants(text)
    }
    
    try {
      isLoading.value = true
      const response = await apiCall('/search/phonetic-variants', 'POST', { text })
      const apiVariants = response.variants || []
      
      // Combine API variants with local variants
      const localVariants = generateSearchVariants(text)
      const allVariants = new Set([...localVariants, ...apiVariants])
      
      return Array.from(allVariants)
    } catch (error) {
      console.warn('API phonetic variants failed, falling back to local variants:', error)
      return generateSearchVariants(text)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Enhanced phonetic matching with API support for kanji
   * @param {string} searchTerm - Term to search for
   * @param {string} targetText - Text to search in
   * @returns {Promise<boolean>} True if match found
   */
  async function phoneticMatchWithAPI(searchTerm, targetText) {
    if (!searchTerm || !targetText) return false
    
    // First try local phonetic match (fast)
    if (phoneticMatch(searchTerm, targetText)) {
      return true
    }
    
    await initializeAPI()
    
    // If no API available, return local result
    if (!apiCall) {
      return false
    }
    
    // Check if either text contains kanji
    const kanjiRegex = /[一-龯]/
    const hasKanji = kanjiRegex.test(searchTerm) || kanjiRegex.test(targetText)
    
    if (!hasKanji) {
      return false // Local match already failed and no kanji to convert
    }
    
    try {
      // Get enhanced variants using API for kanji conversion
      const searchVariants = await getPhoneticVariantsWithAPI(searchTerm)
      const targetVariants = await getPhoneticVariantsWithAPI(targetText)
      
      // Check if any search variant matches any target variant
      for (const searchVariant of searchVariants) {
        for (const targetVariant of targetVariants) {
          if (targetVariant.includes(searchVariant) || searchVariant.includes(targetVariant)) {
            return true
          }
        }
      }
      
      return false
    } catch (error) {
      console.warn('API phonetic matching failed:', error)
      return false
    }
  }

  return {
    // State
    isLoading,
    
    // Conversion methods
    hiraganaToKatakana,
    katakanaToHiragana,
    romajiToKana,
    
    // Search matching
    phoneticMatch,
    fuzzyPhoneticMatch,
    generateSearchVariants,
    
    // API-enhanced methods
    convertTextWithAPI,
    getPhoneticVariantsWithAPI,
    phoneticMatchWithAPI,
    
    // Utilities
    normalizePhoneNumber,
    normalizeEmail,
    calculateSimilarity
  }
}