import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import SearchSuggestions from '../SearchSuggestions.vue';

// Mock AccessibilityService
vi.mock('../../services/AccessibilityService', () => ({
  default: {
    announce: vi.fn(),
    announceSuggestionSelection: vi.fn()
  }
}));

// Import the mocked service
import accessibilityService from '../../services/AccessibilityService';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    getAll: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SearchSuggestions.vue', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createComponent = (props = {}) => {
    return mount(SearchSuggestions, {
      props: {
        suggestions: [],
        searchQuery: '',
        maxRecentSearches: 3,
        selectedIndex: -1,
        ...props,
      },
    });
  };

  it('renders empty state when no suggestions', () => {
    const wrapper = createComponent();
    expect(wrapper.find('.no-suggestions').exists()).toBe(true);
    expect(wrapper.find('.no-suggestions').text()).toContain('検索候補はありません');
  });

  it('renders categorized suggestions correctly', async () => {
    const suggestions = [
      { text: 'John Smith', type: 'guest_name', count: 3 },
      { text: 'jane@example.com', type: 'email', count: 1 },
      { text: 'RES-12345', type: 'reservation_id', count: 1 },
    ];

    const wrapper = createComponent({ suggestions });

    // Check category headings
    expect(wrapper.find('.category-title').text()).toContain('宿泊者名');
    
    // Check suggestion items
    const items = wrapper.findAll('.suggestion-list li');
    expect(items.length).toBe(3);
    
    // Check first suggestion content
    expect(items[0].text()).toContain('John Smith');
    expect(items[0].find('.suggestion-count').text()).toBe('3');
  });

  it('highlights matching text based on search query', async () => {
    const suggestions = [
      { text: 'John Smith', type: 'guest_name' },
    ];

    const wrapper = createComponent({ 
      suggestions,
      searchQuery: 'John'
    });

    // Check that the text is highlighted
    const highlightedText = wrapper.find('.suggestion-text').html();
    expect(highlightedText).toContain('<strong>John</strong>');
  });

  it('emits select event when suggestion is clicked', async () => {
    const suggestions = [
      { text: 'John Smith', type: 'guest_name' },
    ];

    const wrapper = createComponent({ suggestions });
    
    await wrapper.find('.suggestion-list li').trigger('click');
    
    expect(wrapper.emitted().select).toBeTruthy();
    expect(wrapper.emitted().select[0][0]).toEqual(suggestions[0]);
    
    // Check accessibility announcement
    expect(accessibilityService.announce).toHaveBeenCalledWith(
      expect.stringContaining('John Smith'),
      'assertive'
    );
  });

  it('adds selected suggestion to recent searches', async () => {
    const suggestions = [
      { text: 'John Smith', type: 'guest_name' },
    ];

    const wrapper = createComponent({ suggestions });
    
    await wrapper.find('.suggestion-list li').trigger('click');
    
    // Check localStorage was called
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'recentSearches',
      expect.any(String)
    );
    
    // Parse the saved data
    const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(savedData[0].text).toBe('John Smith');
  });

  it('loads recent searches from localStorage on mount', async () => {
    const recentSearches = [
      { text: 'Previous Search', type: 'guest_name', timestamp: Date.now() }
    ];
    
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(recentSearches));
    
    const wrapper = createComponent();
    
    // Wait for component to mount and process
    await wrapper.vm.$nextTick();
    
    // Check if recent searches section exists
    expect(wrapper.find('.category-title').text()).toContain('最近の検索');
    expect(wrapper.find('.suggestion-list li').text()).toContain('Previous Search');
  });

  it('emits navigate event when navigation methods are called', async () => {
    const suggestions = [
      { text: 'John Smith', type: 'guest_name' },
      { text: 'Jane Doe', type: 'guest_name' },
    ];

    const wrapper = createComponent({ suggestions });
    
    // Call navigation method directly
    wrapper.vm.navigateNext();
    
    expect(wrapper.emitted().navigate).toBeTruthy();
    expect(wrapper.emitted().navigate[0][0]).toEqual({
      category: 'guest_name',
      index: 0
    });
  });

  it('handles ARIA attributes correctly for accessibility', () => {
    const suggestions = [
      { text: 'John Smith', type: 'guest_name' },
    ];

    const wrapper = createComponent({ suggestions });
    
    // Check container ARIA attributes
    expect(wrapper.attributes('role')).toBe('listbox');
    expect(wrapper.attributes('aria-label')).toBe('検索候補');
    
    // Check list item ARIA attributes
    const listItem = wrapper.find('.suggestion-list li');
    expect(listItem.attributes('role')).toBe('option');
    expect(listItem.attributes('aria-selected')).toBe('false');
  });
  
  it('properly escapes special regex characters in search query for highlighting', () => {
    const suggestions = [
      { text: 'John (Smith)', type: 'guest_name' },
    ];

    const wrapper = createComponent({ 
      suggestions,
      searchQuery: '(Smith)'
    });

    // Check that the text with special characters is highlighted correctly
    const highlightedText = wrapper.find('.suggestion-text').html();
    expect(highlightedText).toContain('<strong>(Smith)</strong>');
  });
});