import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AccessibilityService } from '../AccessibilityService';

describe('AccessibilityService', () => {
  let accessibilityService;
  let mockDocument;
  
  beforeEach(() => {
    // Mock DOM elements
    const mockAnnouncer = {
      id: 'sr-announcer',
      setAttribute: vi.fn(),
      classList: {
        add: vi.fn()
      },
      textContent: ''
    };
    
    const mockBody = {
      appendChild: vi.fn()
    };
    
    const mockHead = {
      appendChild: vi.fn()
    };
    
    const mockStyle = {
      textContent: ''
    };
    
    mockDocument = {
      getElementById: vi.fn().mockReturnValue(null),
      createElement: vi.fn((tag) => {
        if (tag === 'div') return mockAnnouncer;
        if (tag === 'style') return mockStyle;
        return {};
      }),
      body: mockBody,
      head: mockHead
    };
    
    // Save original document
    const originalDocument = global.document;
    
    // Replace global document with mock
    global.document = mockDocument;
    
    // Create service instance
    accessibilityService = new AccessibilityService();
    
    // Restore original document
    global.document = originalDocument;
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  it('initializes announcer element on creation', () => {
    expect(mockDocument.createElement).toHaveBeenCalledWith('div');
    expect(mockDocument.body.appendChild).toHaveBeenCalled();
  });
  
  it('sets correct ARIA attributes on announcer', () => {
    const mockAnnouncer = mockDocument.createElement('div');
    expect(mockAnnouncer.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
    expect(mockAnnouncer.setAttribute).toHaveBeenCalledWith('aria-atomic', 'true');
    expect(mockAnnouncer.classList.add).toHaveBeenCalledWith('sr-only');
  });
  
  it('adds screen reader only style', () => {
    const mockStyle = mockDocument.createElement('style');
    expect(mockStyle.textContent).toContain('.sr-only');
    expect(mockDocument.head.appendChild).toHaveBeenCalled();
  });
  
  it('announces messages with correct priority', () => {
    // Mock setTimeout
    vi.useFakeTimers();
    
    // Mock announcer
    accessibilityService.announcer = {
      setAttribute: vi.fn(),
      textContent: ''
    };
    
    // Test polite announcement
    accessibilityService.announce('Test message', 'polite');
    expect(accessibilityService.announcer.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
    expect(accessibilityService.announcer.textContent).toBe('');
    
    // Advance timers
    vi.runAllTimers();
    expect(accessibilityService.announcer.textContent).toBe('Test message');
    
    // Test assertive announcement
    accessibilityService.announce('Important message', 'assertive');
    expect(accessibilityService.announcer.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive');
    
    // Restore timers
    vi.useRealTimers();
  });
  
  it('announces search results correctly', () => {
    // Spy on announce method
    const announceSpy = vi.spyOn(accessibilityService, 'announce');
    
    // Test with results
    accessibilityService.announceSearchResults(5, 'test');
    expect(announceSpy).toHaveBeenCalledWith(
      '「test」の検索結果が5件見つかりました。', 
      'polite'
    );
    
    // Test with no results
    accessibilityService.announceSearchResults(0, 'test');
    expect(announceSpy).toHaveBeenCalledWith(
      '「test」の検索結果はありません。', 
      'polite'
    );
  });
  
  it('announces loading state correctly', () => {
    // Spy on announce method
    const announceSpy = vi.spyOn(accessibilityService, 'announce');
    
    // Test loading state
    accessibilityService.announceLoadingState(true, 'test');
    expect(announceSpy).toHaveBeenCalledWith(
      '「test」を検索中...', 
      'polite'
    );
    
    // Test not loading
    accessibilityService.announceLoadingState(false, 'test');
    expect(announceSpy).toHaveBeenCalledTimes(1); // Should not call announce again
  });
  
  it('announces suggestion selection correctly', () => {
    // Spy on announce method
    const announceSpy = vi.spyOn(accessibilityService, 'announce');
    
    // Test suggestion selection
    const suggestion = { text: 'Test Suggestion', type: 'guest_name' };
    accessibilityService.announceSuggestionSelection(suggestion, 2, 10);
    
    expect(announceSpy).toHaveBeenCalledWith(
      expect.stringContaining('候補 3/10: Test Suggestion (宿泊者名)'),
      'polite'
    );
  });
  
  it('returns correct suggestion type labels', () => {
    expect(accessibilityService.getSuggestionTypeLabel('guest_name')).toBe('宿泊者名');
    expect(accessibilityService.getSuggestionTypeLabel('reservation_id')).toBe('予約ID');
    expect(accessibilityService.getSuggestionTypeLabel('unknown')).toBe('unknown');
    expect(accessibilityService.getSuggestionTypeLabel()).toBe('候補');
  });
  
  it('handles keyboard shortcuts correctly', () => {
    // Test global search shortcut (Ctrl+K)
    const ctrlKEvent = {
      ctrlKey: true,
      key: 'k',
      preventDefault: vi.fn()
    };
    
    const handlers = {
      globalSearch: vi.fn(),
      escape: vi.fn()
    };
    
    const result1 = accessibilityService.handleKeyboardShortcuts(ctrlKEvent, handlers);
    expect(result1).toBe(true);
    expect(ctrlKEvent.preventDefault).toHaveBeenCalled();
    expect(handlers.globalSearch).toHaveBeenCalled();
    
    // Test Cmd+K (Mac)
    const cmdKEvent = {
      metaKey: true,
      key: 'k',
      preventDefault: vi.fn()
    };
    
    const result2 = accessibilityService.handleKeyboardShortcuts(cmdKEvent, handlers);
    expect(result2).toBe(true);
    expect(cmdKEvent.preventDefault).toHaveBeenCalled();
    
    // Test Escape key
    const escapeEvent = {
      key: 'Escape',
      preventDefault: vi.fn()
    };
    
    const result3 = accessibilityService.handleKeyboardShortcuts(escapeEvent, handlers);
    expect(result3).toBe(true);
    expect(handlers.escape).toHaveBeenCalled();
    
    // Test unhandled key
    const otherEvent = {
      key: 'a',
      preventDefault: vi.fn()
    };
    
    const result4 = accessibilityService.handleKeyboardShortcuts(otherEvent, handlers);
    expect(result4).toBe(false);
    expect(otherEvent.preventDefault).not.toHaveBeenCalled();
  });
});