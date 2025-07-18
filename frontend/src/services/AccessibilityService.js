/**
 * Accessibility service for search components
 * Provides utilities for screen reader announcements and keyboard navigation
 */
export class AccessibilityService {
  constructor() {
    this.announcer = null;
    this.initializeAnnouncer();
  }

  /**
   * Initialize the screen reader announcer element
   * @private
   */
  initializeAnnouncer() {
    if (typeof document === 'undefined') return;
    
    // Check if announcer already exists
    this.announcer = document.getElementById('sr-announcer');
    
    if (!this.announcer) {
      // Create announcer element
      this.announcer = document.createElement('div');
      this.announcer.id = 'sr-announcer';
      this.announcer.setAttribute('aria-live', 'polite');
      this.announcer.setAttribute('aria-atomic', 'true');
      this.announcer.classList.add('sr-only');
      
      // Add to DOM
      document.body.appendChild(this.announcer);
      
      // Add style for screen reader only
      const style = document.createElement('style');
      style.textContent = `
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - Priority level ('polite' or 'assertive')
   */
  announce(message, priority = 'polite') {
    if (!this.announcer) this.initializeAnnouncer();
    if (!this.announcer) return;
    
    // Set priority
    this.announcer.setAttribute('aria-live', priority);
    
    // Clear previous announcement
    this.announcer.textContent = '';
    
    // Small delay to ensure screen readers register the change
    setTimeout(() => {
      this.announcer.textContent = message;
    }, 50);
  }

  /**
   * Announce search results to screen readers
   * @param {number} count - Number of results
   * @param {string} query - Search query
   */
  announceSearchResults(count, query) {
    if (count === 0) {
      this.announce(`「${query}」の検索結果はありません。`, 'polite');
    } else {
      this.announce(`「${query}」の検索結果が${count}件見つかりました。`, 'polite');
    }
  }

  /**
   * Announce loading state to screen readers
   * @param {boolean} isLoading - Whether search is loading
   * @param {string} query - Search query
   */
  announceLoadingState(isLoading, query) {
    if (isLoading) {
      this.announce(`「${query}」を検索中...`, 'polite');
    }
  }

  /**
   * Announce suggestion selection to screen readers
   * @param {Object} suggestion - Selected suggestion
   * @param {number} index - Index of selected suggestion
   * @param {number} total - Total number of suggestions
   */
  announceSuggestionSelection(suggestion, index, total) {
    if (!suggestion) return;
    
    const position = index + 1;
    const type = this.getSuggestionTypeLabel(suggestion.type);
    
    this.announce(
      `候補 ${position}/${total}: ${suggestion.text} (${type})。選択するには Enter キーを押してください。`,
      'polite'
    );
  }

  /**
   * Get human-readable label for suggestion type
   * @param {string} type - Suggestion type
   * @returns {string} - Human-readable label
   */
  getSuggestionTypeLabel(type) {
    const typeLabels = {
      'guest_name': '宿泊者名',
      'reservation_id': '予約ID',
      'phone': '電話番号',
      'email': 'メールアドレス',
      'default': '候補'
    };
    
    return typeLabels[type] || type || '候補';
  }

  /**
   * Handle keyboard shortcuts for search components
   * @param {KeyboardEvent} event - Keyboard event
   * @param {Object} handlers - Event handlers
   */
  handleKeyboardShortcuts(event, handlers = {}) {
    // Global search shortcut (Ctrl+K / Cmd+K)
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      if (handlers.globalSearch) handlers.globalSearch();
      return true;
    }
    
    // Escape key
    if (event.key === 'Escape') {
      if (handlers.escape) handlers.escape();
      return true;
    }
    
    return false;
  }
}

// Create a singleton instance for global use
const accessibilityService = new AccessibilityService();

export default accessibilityService;