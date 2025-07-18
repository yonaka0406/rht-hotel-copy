/**
 * Service for caching search suggestions to reduce API calls
 * Provides methods for storing, retrieving, and managing suggestion cache
 */
export class SuggestionCacheService {
  constructor(options = {}) {
    this.cacheMap = new Map();
    this.options = {
      expirationTime: 5 * 60 * 1000, // 5 minutes default
      maxCacheSize: 100, // Maximum number of cached queries
      ...options
    };
  }

  /**
   * Get cached suggestions for a query
   * @param {string} query - Search query
   * @returns {Array|null} - Cached suggestions or null if not found/expired
   */
  get(query) {
    if (!query) return null;
    
    const normalizedQuery = query.toLowerCase().trim();
    const cachedItem = this.cacheMap.get(normalizedQuery);
    
    if (!cachedItem) return null;
    
    // Check if cache has expired
    if (Date.now() - cachedItem.timestamp > this.options.expirationTime) {
      this.cacheMap.delete(normalizedQuery);
      return null;
    }
    
    return cachedItem.suggestions;
  }

  /**
   * Store suggestions in cache
   * @param {string} query - Search query
   * @param {Array} suggestions - Suggestions to cache
   */
  set(query, suggestions) {
    if (!query || !suggestions) return;
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Enforce cache size limit
    if (this.cacheMap.size >= this.options.maxCacheSize) {
      // Remove oldest entry
      const oldestKey = this._getOldestCacheKey();
      if (oldestKey) {
        this.cacheMap.delete(oldestKey);
      }
    }
    
    this.cacheMap.set(normalizedQuery, {
      suggestions: [...suggestions], // Clone to avoid reference issues
      timestamp: Date.now()
    });
  }

  /**
   * Check if a query exists in cache and is not expired
   * @param {string} query - Search query
   * @returns {boolean} - True if valid cache exists
   */
  has(query) {
    if (!query) return false;
    
    const normalizedQuery = query.toLowerCase().trim();
    const cachedItem = this.cacheMap.get(normalizedQuery);
    
    if (!cachedItem) return false;
    
    // Check if cache has expired
    if (Date.now() - cachedItem.timestamp > this.options.expirationTime) {
      this.cacheMap.delete(normalizedQuery);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cached suggestions
   */
  clear() {
    this.cacheMap.clear();
  }

  /**
   * Get the number of cached queries
   * @returns {number} - Number of cached queries
   */
  size() {
    return this.cacheMap.size;
  }

  /**
   * Find the oldest cache key for removal
   * @private
   * @returns {string|null} - Oldest cache key or null if empty
   */
  _getOldestCacheKey() {
    if (this.cacheMap.size === 0) return null;
    
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of this.cacheMap.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  /**
   * Remove expired cache entries
   * @returns {number} - Number of entries removed
   */
  removeExpired() {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, value] of this.cacheMap.entries()) {
      if (now - value.timestamp > this.options.expirationTime) {
        this.cacheMap.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;
    
    for (const [_, value] of this.cacheMap.entries()) {
      if (now - value.timestamp > this.options.expirationTime) {
        expiredCount++;
      }
      // Rough estimation of memory usage
      totalSize += JSON.stringify(value.suggestions).length * 2; // Unicode chars are 2 bytes
    }
    
    return {
      totalEntries: this.cacheMap.size,
      expiredEntries: expiredCount,
      validEntries: this.cacheMap.size - expiredCount,
      approximateSizeBytes: totalSize,
      expirationTimeMs: this.options.expirationTime
    };
  }
}

// Create a singleton instance for global use
const suggestionCache = new SuggestionCacheService();

export default suggestionCache;