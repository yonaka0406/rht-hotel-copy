<template>
  <div 
    class="search-suggestions-container max-w-full overflow-x-auto" 
    role="listbox"
    :aria-activedescendant="activeItemId"
    aria-label="検索候補"
  >
    <!-- Recent searches section -->
    <div v-if="recentSearches.length > 0" class="suggestion-category">
      <h3 class="category-title" id="recent-searches-heading">
        <i class="pi pi-history"></i>
        最近の検索
      </h3>
      <ul 
        class="suggestion-list" 
        aria-labelledby="recent-searches-heading"
      >
        <li 
          v-for="(item, index) in recentSearches" 
          :key="`recent-${index}`"
          :id="`suggestion-recent-${index}`"
          :class="{ 'selected': isItemSelected('recent', index) }"
          @click="selectSuggestion(item)"
          @mouseenter="setSelectedItem('recent', index)"
          role="option"
          :aria-selected="isItemSelected('recent', index)"
          tabindex="-1"
        >
          <span class="suggestion-text">{{ item.text }}</span>
          <span class="suggestion-action">
            <i class="pi pi-clock"></i>
          </span>
        </li>
      </ul>
    </div>

    <!-- Categorized suggestions -->
    <div v-for="(items, category) in categorizedSuggestions" :key="category" class="suggestion-category">
      <h3 class="category-title" :id="`${category}-heading`">
        <i :class="getCategoryIcon(category)"></i>
        {{ getCategoryLabel(category) }}
      </h3>
      <ul 
        class="suggestion-list"
        :aria-labelledby="`${category}-heading`"
      >
        <li 
          v-for="(item, index) in items" 
          :key="`${category}-${index}`"
          :id="`suggestion-${category}-${index}`"
          :class="{ 'selected': isItemSelected(category, index) }"
          @click="selectSuggestion(item)"
          @mouseenter="setSelectedItem(category, index)"
          role="option"
          :aria-selected="isItemSelected(category, index)"
          tabindex="-1"
        >
          <span class="suggestion-text">
            <div class="suggestion-main">
              <span v-html="highlightMatch(item.text || item.name, searchQuery)" class="client-name"></span>
              <span v-if="item.email" class="client-email">{{ item.email }}</span>
              <span v-if="item.phone" class="client-phone">{{ item.phone }}</span>
            </div>
            <div class="suggestion-details">
              <span v-if="item.check_in && item.check_out" class="reservation-dates">
                [{{ formatJpDate(item.check_in) }} → {{ formatJpDate(item.check_out) }}]
              </span>
              <span v-else-if="item.check_in" class="reservation-dates">
                [{{ formatJpDate(item.check_in) }}]
              </span>
              <span v-else-if="item.check_out" class="reservation-dates">
                [→ {{ formatJpDate(item.check_out) }}]
              </span>
              <span v-if="item.number_of_people" class="reservation-people">
                ({{ item.number_of_people }}名)
              </span>
              <span v-if="item.ota_reservation_id" class="ota-reservation-id">
                OTA予約ID: {{ item.ota_reservation_id }}
              </span>
            </div>
          </span>
          <span v-if="item.count" class="suggestion-count">{{ item.count }}</span>
        </li>
      </ul>
    </div>

    <!-- No suggestions message -->
    <div v-if="isEmpty" class="no-suggestions">
      <p>検索候補はありません</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import accessibilityService from '../services/AccessibilityService';
import { useRouter } from 'vue-router';

function formatJpDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  // Convert to JST
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yy = jst.getFullYear();
  const mm = String(jst.getMonth() + 1).padStart(2, '0');
  const dd = String(jst.getDate()).padStart(2, '0');
  return `${yy}年${mm}月${dd}日`;
}

export default {
  name: 'SearchSuggestions',
  
  props: {
    /**
     * Search suggestions to display
     */
    suggestions: {
      type: Array,
      default: () => []
    },
    
    /**
     * Current search query
     */
    searchQuery: {
      type: String,
      default: ''
    },
    
    /**
     * Maximum number of recent searches to display
     */
    maxRecentSearches: {
      type: Number,
      default: 3
    },
    
    /**
     * Selected suggestion index
     */
    selectedIndex: {
      type: Number,
      default: -1
    }
  },
  
  emits: [
    'select',
    'highlight',
    'navigate',
    'close-modal'
  ],
  
  setup(props, { emit }) {
    const router = useRouter();
    // Local state
    const recentSearches = ref([]);
    const selectedCategory = ref('');
    const selectedItemIndex = ref(-1);
    const suggestionCache = ref(new Map());
    
    // Computed properties
    const categorizedSuggestions = computed(() => {
      const categories = {};
      
      props.suggestions.forEach(suggestion => {
        const category = suggestion.type || 'default';
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(suggestion);
      });
      
      return categories;
    });
    
    const isEmpty = computed(() => {
      return props.suggestions.length === 0 && recentSearches.value.length === 0;
    });
    
    const activeItemId = computed(() => {
      if (selectedCategory.value && selectedItemIndex.value >= 0) {
        return `suggestion-${selectedCategory.value}-${selectedItemIndex.value}`;
      }
      return '';
    });
    
    // Watch for external selection changes
    watch(() => props.selectedIndex, (newIndex) => {
      if (newIndex === -1) {
        selectedCategory.value = '';
        selectedItemIndex.value = -1;
        return;
      }
      
      // Find the category and index that corresponds to the overall index
      let currentIndex = 0;
      
      // Check recent searches first
      if (recentSearches.value.length > 0) {
        if (newIndex < recentSearches.value.length) {
          selectedCategory.value = 'recent';
          selectedItemIndex.value = newIndex;
          return;
        }
        currentIndex += recentSearches.value.length;
      }
      
      // Check each category
      for (const [category, items] of Object.entries(categorizedSuggestions.value)) {
        if (newIndex < currentIndex + items.length) {
          selectedCategory.value = category;
          selectedItemIndex.value = newIndex - currentIndex;
          return;
        }
        currentIndex += items.length;
      }
    });
    
    // Watch for selection changes to announce to screen readers
    watch([selectedCategory, selectedItemIndex], ([newCategory, newIndex]) => {
      if (newCategory && newIndex >= 0) {
        const suggestion = getSuggestionBySelection();
        if (suggestion) {
          // Calculate total suggestions for screen reader announcement
          let totalSuggestions = recentSearches.value.length;
          Object.values(categorizedSuggestions.value).forEach(items => {
            totalSuggestions += items.length;
          });
          
          // Calculate overall index for screen reader
          let overallIndex = newIndex;
          if (newCategory !== 'recent') {
            overallIndex += recentSearches.value.length;
            for (const [cat, items] of Object.entries(categorizedSuggestions.value)) {
              if (cat === newCategory) break;
              overallIndex += items.length;
            }
          }
          
          // Announce selection to screen readers
          accessibilityService.announceSuggestionSelection(
            suggestion, 
            overallIndex, 
            totalSuggestions
          );
        }
      }
    });
    
    // Add a debug log when suggestions are rendered
    watch(() => props.suggestions, (newSuggestions) => {
      console.debug('[SearchSuggestions] suggestions prop changed:', newSuggestions);
    });
    
    // Methods
    const getCategoryLabel = (category) => {
      const labels = {
        'guest_name': '宿泊者名',
        'reservation_id': '予約ID',
        'phone': '電話番号',
        'email': 'メールアドレス',
        'default': '候補'
      };
      
      return labels[category] || category;
    };
    
    const getCategoryIcon = (category) => {
      const icons = {
        'guest_name': 'pi pi-user',
        'reservation_id': 'pi pi-id-card',
        'phone': 'pi pi-phone',
        'email': 'pi pi-envelope',
        'default': 'pi pi-list'
      };
      
      return icons[category] || 'pi pi-list';
    };
    
    const isItemSelected = (category, index) => {
      return selectedCategory.value === category && selectedItemIndex.value === index;
    };
    
    const setSelectedItem = (category, index) => {
      selectedCategory.value = category;
      selectedItemIndex.value = index;
      
      // Calculate overall index for parent component
      let overallIndex = index;
      
      if (category !== 'recent') {
        // Add recent searches count
        overallIndex += recentSearches.value.length;
        
        // Add counts of previous categories
        for (const [cat, items] of Object.entries(categorizedSuggestions.value)) {
          if (cat === category) break;
          overallIndex += items.length;
        }
      }
      
      emit('highlight', overallIndex);
    };
    
    const selectSuggestion = (suggestion) => {
      console.debug('[SearchSuggestions] selectSuggestion:', suggestion);
      emit('select', suggestion);

      // Add to recent searches
      addToRecentSearches(suggestion);

      if (suggestion.reservation_id) {
        console.debug('[SearchSuggestions] Emitting close-modal and routing to ReservationEdit:', suggestion.reservation_id);
        emit('close-modal');
        router.push({
          name: 'ReservationEdit',
          params: { reservation_id: suggestion.reservation_id }
        });
      }
      
      // Announce selection to screen readers
      accessibilityService.announce(
        `「${suggestion.text}」を選択しました。`, 
        'assertive'
      );
    };
    
    const addToRecentSearches = (suggestion) => {
      console.debug('[SearchSuggestions] addToRecentSearches:', suggestion);
      // Create a copy with timestamp
      const recentItem = {
        ...suggestion,
        timestamp: Date.now()
      };
      
      // Remove if already exists
      recentSearches.value = recentSearches.value.filter(item => 
        item.text !== suggestion.text
      );
      
      // Add to beginning
      recentSearches.value.unshift(recentItem);
      
      // Limit to max items
      if (recentSearches.value.length > props.maxRecentSearches) {
        recentSearches.value = recentSearches.value.slice(0, props.maxRecentSearches);
      }
      
      // Save to localStorage
      saveRecentSearches();
    };
    
    const loadRecentSearches = () => {
      try {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
          recentSearches.value = JSON.parse(saved);
        }
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    };
    
    const saveRecentSearches = () => {
      try {
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches.value));
      } catch (error) {
        console.error('Failed to save recent searches:', error);
      }
    };
    
    const highlightMatch = (text, query) => {
      if (!query || !text) return text;
      
      try {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
      } catch (error) {
        return text;
      }
    };
    
    const handleKeyNavigation = (event) => {
      // Only handle if we have suggestions
      if (isEmpty.value) return;
      
      switch (event.key) {
        case 'ArrowDown':
          navigateNext();
          event.preventDefault();
          break;
          
        case 'ArrowUp':
          navigatePrevious();
          event.preventDefault();
          break;
          
        case 'Enter':
          if (selectedCategory.value && selectedItemIndex.value >= 0) {
            const suggestion = getSuggestionBySelection();
            if (suggestion) {
              selectSuggestion(suggestion);
              event.preventDefault();
            }
          }
          break;
      }
    };
    
    const navigateNext = () => {
      // Get all categories and their items
      const allCategories = [];
      
      if (recentSearches.value.length > 0) {
        allCategories.push({
          name: 'recent',
          items: recentSearches.value
        });
      }
      
      Object.entries(categorizedSuggestions.value).forEach(([category, items]) => {
        allCategories.push({
          name: category,
          items
        });
      });
      
      if (allCategories.length === 0) return;
      
      // If nothing selected, select first item
      if (!selectedCategory.value) {
        selectedCategory.value = allCategories[0].name;
        selectedItemIndex.value = 0;
        emit('navigate', { category: selectedCategory.value, index: selectedItemIndex.value });
        return;
      }
      
      // Find current category index
      const currentCategoryIndex = allCategories.findIndex(c => c.name === selectedCategory.value);
      
      if (currentCategoryIndex === -1) {
        // Reset to first item
        selectedCategory.value = allCategories[0].name;
        selectedItemIndex.value = 0;
      } else {
        const currentCategory = allCategories[currentCategoryIndex];
        
        // If not at end of current category
        if (selectedItemIndex.value < currentCategory.items.length - 1) {
          selectedItemIndex.value++;
        } else {
          // Move to next category
          if (currentCategoryIndex < allCategories.length - 1) {
            selectedCategory.value = allCategories[currentCategoryIndex + 1].name;
            selectedItemIndex.value = 0;
          } else {
            // Wrap to first category
            selectedCategory.value = allCategories[0].name;
            selectedItemIndex.value = 0;
          }
        }
      }
      
      emit('navigate', { category: selectedCategory.value, index: selectedItemIndex.value });
    };
    
    const navigatePrevious = () => {
      // Get all categories and their items
      const allCategories = [];
      
      if (recentSearches.value.length > 0) {
        allCategories.push({
          name: 'recent',
          items: recentSearches.value
        });
      }
      
      Object.entries(categorizedSuggestions.value).forEach(([category, items]) => {
        allCategories.push({
          name: category,
          items
        });
      });
      
      if (allCategories.length === 0) return;
      
      // If nothing selected, select last item of last category
      if (!selectedCategory.value) {
        const lastCategory = allCategories[allCategories.length - 1];
        selectedCategory.value = lastCategory.name;
        selectedItemIndex.value = lastCategory.items.length - 1;
        emit('navigate', { category: selectedCategory.value, index: selectedItemIndex.value });
        return;
      }
      
      // Find current category index
      const currentCategoryIndex = allCategories.findIndex(c => c.name === selectedCategory.value);
      
      if (currentCategoryIndex === -1) {
        // Reset to last item
        const lastCategory = allCategories[allCategories.length - 1];
        selectedCategory.value = lastCategory.name;
        selectedItemIndex.value = lastCategory.items.length - 1;
      } else {
        // If not at beginning of current category
        if (selectedItemIndex.value > 0) {
          selectedItemIndex.value--;
        } else {
          // Move to previous category
          if (currentCategoryIndex > 0) {
            selectedCategory.value = allCategories[currentCategoryIndex - 1].name;
            selectedItemIndex.value = allCategories[currentCategoryIndex - 1].items.length - 1;
          } else {
            // Wrap to last category
            const lastCategory = allCategories[allCategories.length - 1];
            selectedCategory.value = lastCategory.name;
            selectedItemIndex.value = lastCategory.items.length - 1;
          }
        }
      }
      
      emit('navigate', { category: selectedCategory.value, index: selectedItemIndex.value });
    };
    
    const getSuggestionBySelection = () => {
      if (selectedCategory.value === 'recent') {
        return recentSearches.value[selectedItemIndex.value];
      }
      
      const categoryItems = categorizedSuggestions.value[selectedCategory.value];
      if (categoryItems && selectedItemIndex.value >= 0 && selectedItemIndex.value < categoryItems.length) {
        return categoryItems[selectedItemIndex.value];
      }
      
      return null;
    };
    
    // Cache suggestions to reduce API calls
    const cacheSuggestion = (query, suggestions) => {
      suggestionCache.value.set(query.toLowerCase(), {
        suggestions,
        timestamp: Date.now()
      });
    };
    
    const getCachedSuggestions = (query) => {
      const cached = suggestionCache.value.get(query.toLowerCase());
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes cache
        return cached.suggestions;
      }
      return null;
    };
    
    // Lifecycle hooks
    onMounted(() => {
      loadRecentSearches();
      document.addEventListener('keydown', handleKeyNavigation);
      
      // Announce to screen readers that suggestions are available
      if (!isEmpty.value) {
        accessibilityService.announce(
          `${props.suggestions.length}件の検索候補があります。矢印キーで移動し、Enterキーで選択できます。`,
          'polite'
        );
      }
    });
    
    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeyNavigation);
    });
    
    return {
      recentSearches,
      categorizedSuggestions,
      isEmpty,
      selectedCategory,
      selectedItemIndex,
      activeItemId,
      getCategoryLabel,
      getCategoryIcon,
      isItemSelected,
      setSelectedItem,
      selectSuggestion,
      highlightMatch,
      navigateNext,
      navigatePrevious,
      formatJpDate
    };
  }
};
</script>

<style scoped>
.search-suggestions-container {
  width: 100%;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.suggestion-category {
  padding: 0;
  margin: 0;
}

.category-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #666;
  margin: 0;
  padding: 8px 12px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  gap: 8px;
}

.suggestion-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestion-list li {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.suggestion-list li:hover,
.suggestion-list li.selected {
  background-color: #f0f7ff;
}

.suggestion-text {
  flex: 1;
}

.suggestion-text strong {
  font-weight: bold;
  color: #0066cc;
  background-color: rgba(0, 102, 204, 0.1);
}

.reservation-dates {
  color: #888;
  margin-left: 8px;
  font-size: 0.9em;
}
.reservation-people {
  color: #888;
  margin-left: 4px;
  font-size: 0.9em;
}

.ota-reservation-id {
  color: #888;
  margin-left: 8px;
  font-size: 0.9em;
}

.suggestion-count {
  font-size: 0.8em;
  color: #666;
  background: #eee;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 24px;
  text-align: center;
}

.suggestion-action {
  color: #999;
  font-size: 0.9em;
}

.no-suggestions {
  padding: 16px;
  text-align: center;
  color: #666;
}

.suggestion-main {
  display: flex;
  gap: 12px;
  align-items: center;
  font-weight: 500;
}

.client-name {
  color: #222;
}

.client-email, .client-phone {
  color: #888;
  font-size: 0.92em;
}

.suggestion-details {
  display: flex;
  gap: 10px;
  font-size: 0.92em;
  color: #666;
  margin-top: 2px;
}

.reservation-dates, .reservation-people, .ota-reservation-id {
  margin-right: 8px;
}
</style>