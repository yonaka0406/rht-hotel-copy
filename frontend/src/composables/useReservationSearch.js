import { ref, computed, watch, nextTick } from 'vue'
import { usePhoneticSearch } from './usePhoneticSearch.js'

/**
 * Core reservation search composable
 * Provides reactive search state management, debounced API calls, and advanced search features
 */
export function useReservationSearch() {
  // Lazy-load API functionality when needed
  let apiCall = null
  let apiInitialized = false
  
  const initializeAPI = async () => {
    if (apiInitialized) return
    
    try {
      const { useApi } = await import('./useApi')
      const api = useApi()
      apiCall = api.apiCall
      apiInitialized = true
    } catch (error) {
      console.debug('API not available, search functionality limited')
      apiInitialized = true
    }
  }

  // Core search state
  const searchQuery = ref('')
  const searchResults = ref([])
  const isSearching = ref(false)
  const searchSuggestions = ref([])
  const savedSearches = ref([])
  const activeFilters = ref([])
  const searchError = ref(null)
  const lastSearchTime = ref(0)
  
  // Search configuration
  const searchConfig = ref({
    debounceDelay: 300,
    fuzzyThreshold: 0.7,
    maxSuggestions: 10,
    cacheExpiration: 5 * 60 * 1000 // 5 minutes
  })

  // Import suggestion cache service
  let suggestionCache = null
  const initializeCache = async () => {
    if (!suggestionCache) {
      try {
        const { default: cacheService } = await import('../services/SuggestionCacheService')
        suggestionCache = cacheService
      } catch (error) {
        console.debug('Suggestion cache service not available, using local cache')
        suggestionCache = {
          get: () => null,
          set: () => {},
          has: () => false
        }
      }
    }
  }
  
  // Search cache
  const searchCache = ref(new Map())
  
  // Debounce timer
  let debounceTimer = null
  let currentSearchController = null

  // Initialize phonetic search utilities
  const {
    phoneticMatch,
    fuzzyPhoneticMatch,
    normalizePhoneNumber,
    normalizeEmail,
    generateSearchVariants
  } = usePhoneticSearch()

  // Computed properties
  const hasActiveSearch = computed(() => {
    return searchQuery.value.trim().length > 0 || activeFilters.value.length > 0
  })

  const searchResultsCount = computed(() => {
    return searchResults.value.length
  })

  const isSearchEmpty = computed(() => {
    return !hasActiveSearch.value
  })

  /**
   * Parse search query for operators (quotes, minus signs)
   * @param {string} query - Raw search query
   * @returns {Object} Parsed query with operators
   */
  function parseSearchQuery(query) {
    if (!query) return { terms: [], exactTerms: [], excludeTerms: [] }

    const terms = []
    const exactTerms = []
    const excludeTerms = []
    
    // Match quoted strings, minus terms, and regular terms
    const regex = /"([^"]*)"|(-\w+)|(\S+)/g
    let match

    while ((match = regex.exec(query)) !== null) {
      if (match[1] !== undefined) {
        // Quoted exact match (only add if not empty)
        if (match[1].length > 0) {
          exactTerms.push(match[1])
        }
      } else if (match[2]) {
        // Exclude term (starts with minus)
        excludeTerms.push(match[2].substring(1))
      } else if (match[3] && !match[3].startsWith('"')) {
        // Regular term (exclude empty quotes)
        terms.push(match[3])
      }
    }

    return { terms, exactTerms, excludeTerms }
  }

  /**
   * Generate cache key for search parameters
   * @param {string} query - Search query
   * @param {Array} filters - Active filters
   * @returns {string} Cache key
   */
  function generateCacheKey(query, filters = []) {
    const filterKey = filters
      .map(f => `${f.field}:${f.operator}:${JSON.stringify(f.value)}`)
      .sort()
      .join('|')
    return `${query}::${filterKey}`
  }

  /**
   * Check if cached result is still valid
   * @param {Object} cacheEntry - Cached search result
   * @returns {boolean} True if cache is valid
   */
  function isCacheValid(cacheEntry) {
    if (!cacheEntry) return false
    return Date.now() - cacheEntry.timestamp < searchConfig.value.cacheExpiration
  }

  /**
   * Perform search with debouncing and caching
   * @param {string} query - Search query
   * @param {Array} filters - Additional filters
   * @returns {Promise<void>}
   */
  async function performSearch(query = searchQuery.value, filters = activeFilters.value) {
    // Clear previous debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Cancel previous search request
    if (currentSearchController) {
      currentSearchController.abort()
    }

    return new Promise((resolve, reject) => {
      debounceTimer = setTimeout(async () => {
        try {
          await executeSearch(query, filters)
          resolve()
        } catch (error) {
          reject(error)
        }
      }, searchConfig.value.debounceDelay)
    })
  }

  /**
   * Execute the actual search operation
   * @param {string} query - Search query
   * @param {Array} filters - Active filters
   * @returns {Promise<void>}
   */
  async function executeSearch(query, filters) {
    const trimmedQuery = query.trim()
    
    // Clear results if no query and no filters
    if (!trimmedQuery && filters.length === 0) {
      searchResults.value = []
      searchError.value = null
      return
    }

    // Check cache first
    const cacheKey = generateCacheKey(trimmedQuery, filters)
    const cachedResult = searchCache.value.get(cacheKey)
    
    if (isCacheValid(cachedResult)) {
      searchResults.value = cachedResult.results
      searchError.value = null
      return
    }

    await initializeAPI()
    
    if (!apiCall) {
      searchError.value = 'Search functionality not available'
      return
    }

    isSearching.value = true
    searchError.value = null
    currentSearchController = new AbortController()

    try {
      const searchParams = {
        query: trimmedQuery,
        filters,
        fuzzy: true,
        phoneticSearch: true,
        operators: parseSearchQuery(trimmedQuery)
      }

      const response = await apiCall('/search/reservations', 'POST', searchParams, {
        signal: currentSearchController.signal
      })

      if (response.success) {
        searchResults.value = response.results || []
        
        // Cache the results
        searchCache.value.set(cacheKey, {
          results: response.results || [],
          timestamp: Date.now()
        })
        
        lastSearchTime.value = Date.now()
      } else {
        throw new Error(response.message || 'Search failed')
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Search was cancelled, ignore
        return
      }
      
      console.error('Search error:', error)
      searchError.value = error.message || 'Search failed'
      searchResults.value = []
    } finally {
      isSearching.value = false
      currentSearchController = null
    }
  }

  /**
   * Search with operators support (quotes, minus)
   * @param {string} query - Query with operators
   * @returns {Promise<void>}
   */
  async function searchWithOperators(query) {
    searchQuery.value = query
    return performSearch(query, activeFilters.value)
  }

  /**
   * Perform fuzzy search with configurable threshold
   * @param {string} query - Search query
   * @param {number} threshold - Fuzzy matching threshold (0-1)
   * @returns {Promise<void>}
   */
  async function fuzzySearch(query, threshold = searchConfig.value.fuzzyThreshold) {
    const originalThreshold = searchConfig.value.fuzzyThreshold
    searchConfig.value.fuzzyThreshold = threshold
    
    try {
      await performSearch(query, activeFilters.value)
    } finally {
      searchConfig.value.fuzzyThreshold = originalThreshold
    }
  }

  /**
   * Clear search query and results
   */
  function clearSearch() {
    searchQuery.value = ''
    searchResults.value = []
    searchError.value = null
    
    // Cancel any pending search
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    
    if (currentSearchController) {
      currentSearchController.abort()
      currentSearchController = null
    }
  }

  /**
   * Add a filter to active filters
   * @param {Object} filter - Filter object
   */
  function addFilter(filter) {
    // Remove existing filter for the same field
    activeFilters.value = activeFilters.value.filter(f => f.field !== filter.field)
    activeFilters.value.push(filter)
    
    // Trigger search with new filters
    if (hasActiveSearch.value) {
      performSearch()
    }
  }

  /**
   * Remove a filter from active filters
   * @param {string} field - Filter field to remove
   */
  function removeFilter(field) {
    activeFilters.value = activeFilters.value.filter(f => f.field !== field)
    
    // Trigger search with updated filters
    if (hasActiveSearch.value) {
      performSearch()
    }
  }

  /**
   * Clear all active filters
   */
  function clearAllFilters() {
    activeFilters.value = []
    
    // Trigger search without filters
    if (searchQuery.value.trim()) {
      performSearch()
    }
  }

  /**
   * Save current search and filter combination
   * @param {string} name - Name for the saved search
   * @returns {Promise<void>}
   */
  async function saveCurrentSearch(name) {
    if (!name || !hasActiveSearch.value) {
      throw new Error('Search name and active search required')
    }

    await initializeAPI()
    
    if (!apiCall) {
      throw new Error('Save functionality not available')
    }

    const savedSearch = {
      id: Date.now().toString(), // Temporary ID, server will assign real ID
      name: name.trim(),
      query: searchQuery.value,
      filters: [...activeFilters.value],
      createdAt: new Date().toISOString()
    }

    try {
      const response = await apiCall('/search/saved-searches', 'POST', savedSearch)
      
      if (response.success) {
        savedSearch.id = response.id
        savedSearches.value.push(savedSearch)
        return savedSearch
      } else {
        throw new Error(response.message || 'Failed to save search')
      }
    } catch (error) {
      console.error('Save search error:', error)
      throw error
    }
  }

  /**
   * Load a saved search
   * @param {string} searchId - ID of saved search to load
   * @returns {Promise<void>}
   */
  async function loadSavedSearch(searchId) {
    const savedSearch = savedSearches.value.find(s => s.id === searchId)
    
    if (!savedSearch) {
      throw new Error('Saved search not found')
    }

    // Clear current search
    clearSearch()
    
    // Apply saved search parameters
    searchQuery.value = savedSearch.query
    activeFilters.value = [...savedSearch.filters]
    
    // Perform the search
    if (hasActiveSearch.value) {
      await performSearch()
    }
  }

  /**
   * Delete a saved search
   * @param {string} searchId - ID of saved search to delete
   * @returns {Promise<void>}
   */
  async function deleteSavedSearch(searchId) {
    await initializeAPI()
    
    if (!apiCall) {
      throw new Error('Delete functionality not available')
    }

    try {
      const response = await apiCall(`/search/saved-searches/${searchId}`, 'DELETE')
      
      if (response.success) {
        savedSearches.value = savedSearches.value.filter(s => s.id !== searchId)
      } else {
        throw new Error(response.message || 'Failed to delete search')
      }
    } catch (error) {
      console.error('Delete search error:', error)
      throw error
    }
  }

  /**
   * Load all saved searches for current user
   * @returns {Promise<void>}
   */
  async function loadSavedSearches() {
    await initializeAPI()
    
    if (!apiCall) {
      console.debug('Saved searches not available without API')
      return
    }

    try {
      const response = await apiCall('/search/saved-searches', 'GET')
      
      if (response.success) {
        savedSearches.value = response.searches || []
      } else {
        console.warn('Failed to load saved searches:', response.message)
      }
    } catch (error) {
      console.error('Load saved searches error:', error)
    }
  }

  /**
   * Get search suggestions based on partial query
   * @param {string} partialQuery - Partial search query
   * @returns {Promise<void>}
   */
  async function getSearchSuggestions(partialQuery) {
    if (!partialQuery || partialQuery.length < 2) {
      searchSuggestions.value = []
      return
    }

    // Initialize cache service if needed
    await initializeCache()
    
    // Check cache first
    if (suggestionCache && suggestionCache.has(partialQuery)) {
      const cachedSuggestions = suggestionCache.get(partialQuery)
      if (cachedSuggestions) {
        searchSuggestions.value = cachedSuggestions
        return
      }
    }

    await initializeAPI()
    
    if (!apiCall) {
      // Provide basic local suggestions
      searchSuggestions.value = []
      return
    }

    try {
      const response = await apiCall('/search/suggestions', 'POST', {
        query: partialQuery,
        maxSuggestions: searchConfig.value.maxSuggestions
      })
      
      if (response.success) {
        const suggestions = response.suggestions || []
        searchSuggestions.value = suggestions
        
        // Cache the suggestions
        if (suggestionCache) {
          suggestionCache.set(partialQuery, suggestions)
        }
      }
    } catch (error) {
      console.error('Get suggestions error:', error)
      searchSuggestions.value = []
    }
  }

  /**
   * Clear search cache
   */
  function clearCache() {
    searchCache.value.clear()
  }

  /**
   * Update search configuration
   * @param {Object} config - Configuration updates
   */
  function updateConfig(config) {
    Object.assign(searchConfig.value, config)
  }

  // Watch for search query changes to trigger suggestions
  watch(searchQuery, async (newQuery) => {
    if (newQuery && newQuery.length >= 2) {
      await getSearchSuggestions(newQuery)
    } else {
      searchSuggestions.value = []
    }
  })

  // Initialize saved searches on first use
  let savedSearchesLoaded = false
  const ensureSavedSearchesLoaded = async () => {
    if (!savedSearchesLoaded) {
      await loadSavedSearches()
      savedSearchesLoaded = true
    }
  }

  // Cleanup function
  function cleanup() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    if (currentSearchController) {
      currentSearchController.abort()
    }
    clearCache()
  }

  return {
    // State
    searchQuery,
    searchResults,
    isSearching,
    searchSuggestions,
    savedSearches,
    activeFilters,
    searchError,
    searchConfig,
    
    // Computed
    hasActiveSearch,
    searchResultsCount,
    isSearchEmpty,
    
    // Core search methods
    performSearch,
    searchWithOperators,
    fuzzySearch,
    clearSearch,
    
    // Filter management
    addFilter,
    removeFilter,
    clearAllFilters,
    
    // Saved searches
    saveCurrentSearch,
    loadSavedSearch,
    deleteSavedSearch,
    loadSavedSearches: ensureSavedSearchesLoaded,
    
    // Suggestions
    getSearchSuggestions,
    
    // Utilities
    parseSearchQuery,
    clearCache,
    updateConfig,
    cleanup
  }
}