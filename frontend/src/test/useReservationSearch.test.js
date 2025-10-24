import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useReservationSearch } from '../composables/useReservationSearch.js'

// Mock the usePhoneticSearch composable
vi.mock('../composables/usePhoneticSearch', () => ({
    usePhoneticSearch: () => ({
        phoneticMatch: vi.fn((search, target) => search === target),
        fuzzyPhoneticMatch: vi.fn((search, target, _threshold = 0.7) => search === target),
        normalizePhoneNumber: vi.fn((phone) => phone?.replace(/[\s-()]/g, '') || ''),
        normalizeEmail: vi.fn((email) => email?.toLowerCase().trim() || ''),
        generateSearchVariants: vi.fn((text) => [text])
    })
}))

describe('useReservationSearch', () => {
    let searchComposable

    beforeEach(async () => {
        // Reset mocks
        vi.clearAllMocks()

        // Create fresh instance
        searchComposable = useReservationSearch()
    })

    afterEach(() => {
        // Cleanup any timers or pending operations
        if (searchComposable.cleanup) {
            searchComposable.cleanup()
        }
    })

    describe('reactive search state management', () => {
        it('should initialize with empty state', () => {
            expect(searchComposable.searchQuery.value).toBe('')
            expect(searchComposable.searchResults.value).toEqual([])
            expect(searchComposable.isSearching.value).toBe(false)
            expect(searchComposable.searchSuggestions.value).toEqual([])
            expect(searchComposable.savedSearches.value).toEqual([])
            expect(searchComposable.activeFilters.value).toEqual([])
            expect(searchComposable.searchError.value).toBeNull()
        })

        it('should update hasActiveSearch computed property', () => {
            expect(searchComposable.hasActiveSearch.value).toBe(false)

            searchComposable.searchQuery.value = 'test'
            expect(searchComposable.hasActiveSearch.value).toBe(true)

            searchComposable.searchQuery.value = ''
            searchComposable.addFilter({ field: 'status', operator: 'equals', value: 'confirmed' })
            expect(searchComposable.hasActiveSearch.value).toBe(true)
        })

        it('should update searchResultsCount computed property', () => {
            expect(searchComposable.searchResultsCount.value).toBe(0)

            searchComposable.searchResults.value = [{ id: 1 }, { id: 2 }]
            expect(searchComposable.searchResultsCount.value).toBe(2)
        })

        it('should update isSearchEmpty computed property', () => {
            expect(searchComposable.isSearchEmpty.value).toBe(true)

            searchComposable.searchQuery.value = 'test'
            expect(searchComposable.isSearchEmpty.value).toBe(false)
        })
    })

    describe('search query parsing', () => {
        it('should parse search query operators correctly', () => {
            const result = searchComposable.parseSearchQuery('"exact match" regular -exclude another')

            expect(result).toEqual({
                exactTerms: ['exact match'],
                terms: ['regular', 'another'],
                excludeTerms: ['exclude']
            })
        })

        it('should handle empty query parsing', () => {
            const result = searchComposable.parseSearchQuery('')

            expect(result).toEqual({
                exactTerms: [],
                terms: [],
                excludeTerms: []
            })
        })

        it('should parse complex operator combinations', () => {
            const result = searchComposable.parseSearchQuery('"John Doe" "Jane Smith" hotel -cancelled -pending reservation')

            expect(result).toEqual({
                exactTerms: ['John Doe', 'Jane Smith'],
                terms: ['hotel', 'reservation'],
                excludeTerms: ['cancelled', 'pending']
            })
        })

        it('should handle quotes without content', () => {
            const result = searchComposable.parseSearchQuery('test "" another')

            expect(result).toEqual({
                exactTerms: [],
                terms: ['test', 'another'],
                excludeTerms: []
            })
        })

        it('should handle minus signs without terms', () => {
            const result = searchComposable.parseSearchQuery('test - another')

            expect(result).toEqual({
                exactTerms: [],
                terms: ['test', '-', 'another'],
                excludeTerms: []
            })
        })
    })

    describe('filter management', () => {
        it('should add filters correctly', () => {
            const filter = { field: 'status', operator: 'equals', value: 'confirmed', label: 'Confirmed' }
            searchComposable.addFilter(filter)

            expect(searchComposable.activeFilters.value).toHaveLength(1)
            expect(searchComposable.activeFilters.value[0]).toEqual(filter)
            expect(searchComposable.hasActiveSearch.value).toBe(true)
        })

        it('should replace existing filter for same field', () => {
            const filter1 = { field: 'status', operator: 'equals', value: 'confirmed' }
            const filter2 = { field: 'status', operator: 'equals', value: 'pending' }

            searchComposable.addFilter(filter1)
            searchComposable.addFilter(filter2)

            expect(searchComposable.activeFilters.value).toHaveLength(1)
            expect(searchComposable.activeFilters.value[0]).toEqual(filter2)
        })

        it('should remove filters by field', () => {
            const filter1 = { field: 'status', operator: 'equals', value: 'confirmed' }
            const filter2 = { field: 'price', operator: 'between', value: [100, 200] }

            searchComposable.addFilter(filter1)
            searchComposable.addFilter(filter2)

            searchComposable.removeFilter('status')

            expect(searchComposable.activeFilters.value).toHaveLength(1)
            expect(searchComposable.activeFilters.value[0]).toEqual(filter2)
        })

        it('should clear all filters', () => {
            const filter1 = { field: 'status', operator: 'equals', value: 'confirmed' }
            const filter2 = { field: 'price', operator: 'between', value: [100, 200] }

            searchComposable.addFilter(filter1)
            searchComposable.addFilter(filter2)

            searchComposable.clearAllFilters()

            expect(searchComposable.activeFilters.value).toEqual([])
        })

        it('should allow multiple filters for different fields', () => {
            const filter1 = { field: 'status', operator: 'equals', value: 'confirmed' }
            const filter2 = { field: 'price', operator: 'between', value: [100, 200] }
            const filter3 = { field: 'date', operator: 'between', value: ['2024-01-01', '2024-12-31'] }

            searchComposable.addFilter(filter1)
            searchComposable.addFilter(filter2)
            searchComposable.addFilter(filter3)

            expect(searchComposable.activeFilters.value).toHaveLength(3)
            expect(searchComposable.activeFilters.value[0]).toEqual(filter1)
            expect(searchComposable.activeFilters.value[1]).toEqual(filter2)
            expect(searchComposable.activeFilters.value[2]).toEqual(filter3)
        })
    })

    describe('search state management', () => {
        it('should clear search and reset state', () => {
            searchComposable.searchQuery.value = 'test'
            searchComposable.searchResults.value = [{ id: 1 }]
            searchComposable.searchError.value = 'error'

            searchComposable.clearSearch()

            expect(searchComposable.searchQuery.value).toBe('')
            expect(searchComposable.searchResults.value).toEqual([])
            expect(searchComposable.searchError.value).toBeNull()
        })

        it('should handle empty query by clearing results', async () => {
            searchComposable.searchResults.value = [{ id: 1 }]

            await searchComposable.performSearch('')

            expect(searchComposable.searchResults.value).toEqual([])
        })

        it('should handle whitespace-only query', async () => {
            searchComposable.searchResults.value = [{ id: 1 }]

            await searchComposable.performSearch('   ')

            expect(searchComposable.searchResults.value).toEqual([])
        })
    })

    describe('configuration management', () => {
        it('should update configuration', () => {
            const newConfig = {
                debounceDelay: 500,
                fuzzyThreshold: 0.8,
                maxSuggestions: 15
            }

            searchComposable.updateConfig(newConfig)

            expect(searchComposable.searchConfig.value.debounceDelay).toBe(500)
            expect(searchComposable.searchConfig.value.fuzzyThreshold).toBe(0.8)
            expect(searchComposable.searchConfig.value.maxSuggestions).toBe(15)
        })

        it('should preserve existing config when updating partial config', () => {
            const originalConfig = { ...searchComposable.searchConfig.value }

            searchComposable.updateConfig({ debounceDelay: 500 })

            expect(searchComposable.searchConfig.value.debounceDelay).toBe(500)
            expect(searchComposable.searchConfig.value.fuzzyThreshold).toBe(originalConfig.fuzzyThreshold)
            expect(searchComposable.searchConfig.value.maxSuggestions).toBe(originalConfig.maxSuggestions)
        })
    })

    describe('cache management', () => {
        it('should clear cache', () => {
            const clearSpy = vi.spyOn(Map.prototype, 'clear')
            searchComposable.clearCache()

            expect(clearSpy).toHaveBeenCalled()
        })

        it('should generate cache keys correctly', () => {
            // Test the cache key generation indirectly by checking it creates different keys
            const key1 = searchComposable.generateCacheKey?.('query1', [])
            const key2 = searchComposable.generateCacheKey?.('query2', [])
            const key3 = searchComposable.generateCacheKey?.('query1', [{ field: 'status', operator: 'equals', value: 'confirmed' }])

            // If the method is exposed, test it directly
            if (key1 !== undefined) {
                expect(key1).not.toBe(key2)
                expect(key1).not.toBe(key3)
                expect(key2).not.toBe(key3)
            }
        })
    })

    describe('saved searches management (without API)', () => {
        it('should throw error when saving without name', async () => {
            searchComposable.searchQuery.value = 'test'
            await expect(searchComposable.saveCurrentSearch('')).rejects.toThrow('Search name and active search required')
        })

        it('should throw error when saving without active search', async () => {
            await expect(searchComposable.saveCurrentSearch('Test')).rejects.toThrow('Search name and active search required')
        })

        it('should load saved search and apply parameters', async () => {
            const savedSearch = {
                id: 'search123',
                name: 'Test Search',
                query: 'test query',
                filters: [{ field: 'status', operator: 'equals', value: 'confirmed' }]
            }

            searchComposable.savedSearches.value = [savedSearch]

            await searchComposable.loadSavedSearch('search123')

            expect(searchComposable.searchQuery.value).toBe('test query')
            expect(searchComposable.activeFilters.value).toEqual(savedSearch.filters)
        })

        it('should throw error when loading non-existent saved search', async () => {
            await expect(searchComposable.loadSavedSearch('nonexistent')).rejects.toThrow('Saved search not found')
        })
    })

    describe('debouncing behavior', () => {
        it('should debounce search calls', async () => {
            const startTime = Date.now()

            // Make multiple rapid calls
            searchComposable.performSearch('test1')
            searchComposable.performSearch('test2')
            const searchPromise = searchComposable.performSearch('test3')

            await searchPromise

            const endTime = Date.now()
            const duration = endTime - startTime

            // Should have waited at least 300ms (debounce delay)
            expect(duration).toBeGreaterThanOrEqual(300)
        })

        it('should handle rapid successive calls', async () => {
            // This tests that the debouncing mechanism works without throwing errors
            // Make rapid calls but don't wait for all of them - just the last one
            searchComposable.performSearch('test1')
            searchComposable.performSearch('test2')
            searchComposable.performSearch('test3')
            searchComposable.performSearch('test4')
            const lastPromise = searchComposable.performSearch('test5')

            // Wait for the last one to complete (which should be the only one that actually executes)
            await lastPromise

            // If we get here without throwing, the test passes
            expect(true).toBe(true)
        })
    })

    describe('fuzzy search configuration', () => {
        it('should restore original threshold after fuzzy search', async () => {
            const originalThreshold = searchComposable.searchConfig.value.fuzzyThreshold

            await searchComposable.fuzzySearch('test', 0.9)

            expect(searchComposable.searchConfig.value.fuzzyThreshold).toBe(originalThreshold)
        })

        it('should handle fuzzy search with different thresholds', async () => {
            // Test that fuzzy search accepts different threshold values without throwing
            await searchComposable.fuzzySearch('test', 0.5)
            await searchComposable.fuzzySearch('test', 0.8)
            await searchComposable.fuzzySearch('test', 1.0)

            // If we get here without throwing, the test passes
            expect(true).toBe(true)
        })
    })

    describe('search operators', () => {
        it('should handle searchWithOperators method', async () => {
            // Test that the method exists and can be called without throwing
            await searchComposable.searchWithOperators('"John Doe" hotel')

            // If we get here without throwing, the test passes
            expect(true).toBe(true)
        })

        it('should update search query when using searchWithOperators', async () => {
            const query = '"John Doe" hotel -cancelled'
            await searchComposable.searchWithOperators(query)

            expect(searchComposable.searchQuery.value).toBe(query)
        })
    })

    describe('suggestions handling', () => {
        it('should not get suggestions for queries shorter than 2 characters', async () => {
            await searchComposable.getSearchSuggestions('j')

            expect(searchComposable.searchSuggestions.value).toEqual([])
        })

        it('should clear suggestions for empty queries', async () => {
            await searchComposable.getSearchSuggestions('')

            expect(searchComposable.searchSuggestions.value).toEqual([])
        })

        it('should handle null/undefined queries', async () => {
            await searchComposable.getSearchSuggestions(null)
            await searchComposable.getSearchSuggestions(undefined)

            expect(searchComposable.searchSuggestions.value).toEqual([])
        })
    })

    describe('cleanup and resource management', () => {
        it('should have cleanup method', () => {
            expect(typeof searchComposable.cleanup).toBe('function')
        })

        it('should cleanup without errors', () => {
            expect(() => searchComposable.cleanup()).not.toThrow()
        })

        it('should handle cleanup when no operations are pending', () => {
            // Should not throw error when cleanup is called without any pending operations
            expect(() => searchComposable.cleanup()).not.toThrow()
        })
    })

    describe('computed properties reactivity', () => {
        it('should update hasActiveSearch when query changes', async () => {
            expect(searchComposable.hasActiveSearch.value).toBe(false)

            searchComposable.searchQuery.value = 'test'
            await nextTick()

            expect(searchComposable.hasActiveSearch.value).toBe(true)
        })

        it('should update hasActiveSearch when filters change', async () => {
            expect(searchComposable.hasActiveSearch.value).toBe(false)

            searchComposable.addFilter({ field: 'status', operator: 'equals', value: 'confirmed' })
            await nextTick()

            expect(searchComposable.hasActiveSearch.value).toBe(true)
        })

        it('should update searchResultsCount when results change', async () => {
            expect(searchComposable.searchResultsCount.value).toBe(0)

            searchComposable.searchResults.value = [{ id: 1 }, { id: 2 }, { id: 3 }]
            await nextTick()

            expect(searchComposable.searchResultsCount.value).toBe(3)
        })
    })

    describe('error handling', () => {
        it('should initialize with no errors', () => {
            expect(searchComposable.searchError.value).toBeNull()
        })

        it('should clear errors when clearing search', () => {
            searchComposable.searchError.value = 'Some error'

            searchComposable.clearSearch()

            expect(searchComposable.searchError.value).toBeNull()
        })
    })
})