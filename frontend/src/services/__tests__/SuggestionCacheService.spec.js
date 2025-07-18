import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SuggestionCacheService } from '../SuggestionCacheService';

describe('SuggestionCacheService', () => {
  let cacheService;
  
  beforeEach(() => {
    // Create a new instance for each test with short expiration time
    cacheService = new SuggestionCacheService({
      expirationTime: 100, // 100ms for faster testing
      maxCacheSize: 3
    });
    
    // Mock Date.now to control time
    vi.spyOn(Date, 'now').mockImplementation(() => 1000);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  it('should store and retrieve suggestions', () => {
    const query = 'test query';
    const suggestions = [{ text: 'Test Suggestion' }];
    
    cacheService.set(query, suggestions);
    const cached = cacheService.get(query);
    
    expect(cached).toEqual(suggestions);
  });
  
  it('should normalize query case and whitespace', () => {
    const suggestions = [{ text: 'Test Suggestion' }];
    
    cacheService.set('Test Query', suggestions);
    
    expect(cacheService.get('test query')).toEqual(suggestions);
    expect(cacheService.get(' test query ')).toEqual(suggestions);
    expect(cacheService.get('TEST QUERY')).toEqual(suggestions);
  });
  
  it('should return null for non-existent queries', () => {
    expect(cacheService.get('non-existent')).toBeNull();
  });
  
  it('should expire cache entries', () => {
    const query = 'test query';
    const suggestions = [{ text: 'Test Suggestion' }];
    
    cacheService.set(query, suggestions);
    
    // Advance time beyond expiration
    vi.spyOn(Date, 'now').mockImplementation(() => 1200); // 200ms later
    
    expect(cacheService.get(query)).toBeNull();
  });
  
  it('should respect max cache size', () => {
    // Add max + 1 entries
    cacheService.set('query1', [{ text: 'Suggestion 1' }]);
    cacheService.set('query2', [{ text: 'Suggestion 2' }]);
    cacheService.set('query3', [{ text: 'Suggestion 3' }]);
    
    // This should remove the oldest entry (query1)
    cacheService.set('query4', [{ text: 'Suggestion 4' }]);
    
    expect(cacheService.size()).toBe(3);
    expect(cacheService.get('query1')).toBeNull();
    expect(cacheService.get('query2')).not.toBeNull();
  });
  
  it('should check if cache has entry with has() method', () => {
    cacheService.set('test', [{ text: 'Test' }]);
    
    expect(cacheService.has('test')).toBe(true);
    expect(cacheService.has('non-existent')).toBe(false);
    
    // Advance time beyond expiration
    vi.spyOn(Date, 'now').mockImplementation(() => 1200);
    
    expect(cacheService.has('test')).toBe(false);
  });
  
  it('should clear all cache entries', () => {
    cacheService.set('query1', [{ text: 'Suggestion 1' }]);
    cacheService.set('query2', [{ text: 'Suggestion 2' }]);
    
    cacheService.clear();
    
    expect(cacheService.size()).toBe(0);
    expect(cacheService.get('query1')).toBeNull();
  });
  
  it('should remove expired entries', () => {
    cacheService.set('query1', [{ text: 'Suggestion 1' }]);
    cacheService.set('query2', [{ text: 'Suggestion 2' }]);
    
    // Advance time beyond expiration for first entry
    vi.spyOn(Date, 'now').mockImplementation(() => 1050);
    cacheService.set('query3', [{ text: 'Suggestion 3' }]);
    
    // Advance time beyond expiration for all entries except query3
    vi.spyOn(Date, 'now').mockImplementation(() => 1150);
    
    const removed = cacheService.removeExpired();
    
    expect(removed).toBe(2);
    expect(cacheService.size()).toBe(1);
    expect(cacheService.get('query3')).not.toBeNull();
  });
  
  it('should provide cache statistics', () => {
    cacheService.set('query1', [{ text: 'Suggestion 1' }]);
    cacheService.set('query2', [{ text: 'Suggestion 2' }]);
    
    // Advance time beyond expiration for first entry
    vi.spyOn(Date, 'now').mockImplementation(() => 1150);
    
    const stats = cacheService.getStats();
    
    expect(stats.totalEntries).toBe(2);
    expect(stats.expiredEntries).toBe(2);
    expect(stats.validEntries).toBe(0);
    expect(stats.expirationTimeMs).toBe(100);
    expect(stats.approximateSizeBytes).toBeGreaterThan(0);
  });
});