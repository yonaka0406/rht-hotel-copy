<template>
  <div class="reservation-search-bar px-2 py-2 sm:px-4 sm:py-2" role="search">
    <div class="search-input-wrapper mb-2 sm:mb-0">
      <span class="p-input-icon-left p-input-icon-right w-full">
        <i class="pi pi-search" />
        <InputText
          v-model="localQuery"
          class="w-full min-h-[44px]"
          placeholder="予約ID、氏名、電話番号、メールアドレスで検索..."
          @input="onInput"
          @keydown="onKeydown"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
          :disabled="disabled"
          aria-label="予約検索"
          aria-autocomplete="list"
          :aria-controls="showSuggestions ? 'search-suggestions-listbox' : null"
          autocomplete="off"
        />
        <i v-if="delayedLoading" class="pi pi-spin pi-spinner" />
        <i v-else-if="localQuery && !disabled" class="pi pi-times cursor-pointer" @click="clearSearch" />
      </span>
    </div>

    <!-- Search suggestions dropdown -->
    <SearchSuggestions
      v-if="showSuggestions"
      :suggestions="suggestions"
      :search-query="localQuery"
      :selected-index="selectedSuggestionIndex"
      @select="selectSuggestion"
      @highlight="selectedSuggestionIndex = $event"
      @navigate="handleSuggestionNavigation"
      role="listbox"
      id="search-suggestions-listbox"
      class="max-w-full overflow-x-auto"
    />

    <!-- Active filters display -->
    <div v-if="activeFilters.length > 0" class="active-filters flex flex-wrap gap-2 mt-2" role="group" aria-label="アクティブフィルター">
      <span class="filter-label">フィルター:</span>
      <div class="filter-tags flex flex-wrap gap-2">
        <span v-for="(filter, index) in activeFilters" :key="index" class="filter-tag min-h-[44px] flex items-center">
          {{ filter.label }}
          <button class="pi pi-times filter-remove ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center" @click="removeFilter(filter.field)" aria-label="フィルター削除" tabindex="0"></button>
        </span>
        <button class="clear-all min-w-[44px] min-h-[44px] flex items-center justify-center" @click="clearAllFilters" aria-label="すべてクリア" tabindex="0">すべてクリア</button>
      </div>
    </div>

    <!-- Search results count -->
    <div v-if="searchResultsCount !== null && !isSearching && !showSuggestions" class="search-results-count mt-2 sm:mt-0" aria-live="polite">
      {{ searchResultsCount }}件の検索結果
    </div>
    <div v-if="searchResultsCount === 0 && !isSearching && !showSuggestions" class="search-no-results">
      <i class="pi pi-info-circle"></i>
      <span>検索結果がありません</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useReservationSearch } from '../composables/useReservationSearch';
import SearchSuggestions from './SearchSuggestions.vue';
import { InputText } from 'primevue';

export default {
  name: 'ReservationSearchBar',
  
  components: {
    InputText,
    SearchSuggestions
  },
  
  props: {
    /**
     * Search query value
     */
    modelValue: {
      type: String,
      default: ''
    },
    
    /**
     * Search suggestions to display
     */
    suggestions: {
      type: Array,
      default: () => []
    },
    
    /**
     * Whether search is currently in progress
     */
    isSearching: {
      type: Boolean,
      default: false
    },
    
    /**
     * Active filters to display
     */
    activeFilters: {
      type: Array,
      default: () => []
    },
    
    /**
     * Search results count
     */
    searchResultsCount: {
      type: Number,
      default: null
    },
    
    /**
     * Whether the search input is disabled
     */
    disabled: {
      type: Boolean,
      default: false
    }
  },
  
  emits: [
    'update:modelValue',
    'search',
    'clear',
    'suggestion-selected',
    'remove-filter',
    'clear-filters'
  ],
  
  setup(props, { emit }) {
    // Local state
    const localQuery = ref(props.modelValue);
    const showSuggestions = ref(false);
    const selectedSuggestionIndex = ref(-1);
    // Delayed loading spinner
    const delayedLoading = ref(false);
    let loadingTimer = null;
    // IME composition state
    const isComposing = ref(false);

    // Add missing handlers to silence Vue warnings
    const onCompositionStart = () => { isComposing.value = true; };
    const onCompositionEnd = () => { isComposing.value = false; };
    watch(() => props.isSearching, (newVal) => {
      if (newVal) {
        loadingTimer = setTimeout(() => {
          delayedLoading.value = true;
        }, 500);
      } else {
        clearTimeout(loadingTimer);
        delayedLoading.value = false;
      }
    });
    
    // Debounce timer for input
    let debounceTimer = null;
    
    // Watch for external model changes
    watch(() => props.modelValue, (newValue) => {
      localQuery.value = newValue;
    });
    
    // Watch for local query changes to emit update events
    watch(localQuery, (newValue) => {
      emit('update:modelValue', newValue);
    });
    
    // Handle input with debounce
    const onInput = () => {
      if (isComposing.value) return;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      console.debug('[ReservationSearchBar] onInput:', localQuery.value);
      debounceTimer = setTimeout(() => {
        console.debug('[ReservationSearchBar] emit search:', localQuery.value);
        emit('search', localQuery.value);
        
        // Show suggestions if query is not empty
        showSuggestions.value = localQuery.value.trim().length > 0;
      }, 300); // 300ms debounce
    };
    
    // Handle keyboard navigation
    const onKeydown = (event) => {
      console.debug('[ReservationSearchBar] onKeydown:', event.key);
      if (isComposing.value) return;
      if (!showSuggestions.value || props.suggestions.length === 0) {
        if (event.key === 'Enter') {
          console.debug('[ReservationSearchBar] emit search (Enter):', localQuery.value);
          emit('search', localQuery.value);
        }
        return;
      }
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          selectedSuggestionIndex.value = (selectedSuggestionIndex.value + 1) % props.suggestions.length;
          break;
          
        case 'ArrowUp':
          event.preventDefault();
          selectedSuggestionIndex.value = selectedSuggestionIndex.value <= 0 
            ? props.suggestions.length - 1 
            : selectedSuggestionIndex.value - 1;
          break;
          
        case 'Enter':
          event.preventDefault();
          if (selectedSuggestionIndex.value >= 0) {
            selectSuggestion(props.suggestions[selectedSuggestionIndex.value]);
          } else {
            emit('search', localQuery.value);
          }
          break;
          
        case 'Escape':
          event.preventDefault();
          showSuggestions.value = false;
          break;
      }
    };
    
    // Select a suggestion
    const selectSuggestion = (suggestion) => {
      // Use OTA reservation ID for search if present, otherwise fallback to name/email
      const query = suggestion.ota_reservation_id || suggestion.name || suggestion.name_kanji || suggestion.name_kana || suggestion.email || '';
      localQuery.value = query;
      emit('suggestion-selected', suggestion);
      showSuggestions.value = false;
      selectedSuggestionIndex.value = -1;

      // Trigger search with the selected suggestion
      emit('search', query);
    };
    
    // Clear search
    const clearSearch = () => {
      console.debug('[ReservationSearchBar] clearSearch');
      localQuery.value = '';
      showSuggestions.value = false;
      selectedSuggestionIndex.value = -1;
      emit('clear');
    };
    
    // Remove a filter
    const removeFilter = (field) => {
      emit('remove-filter', field);
    };
    
    // Clear all filters
    const clearAllFilters = () => {
      emit('clear-filters');
    };
    
    // Get human-readable label for suggestion type
    const getSuggestionTypeLabel = (type) => {
      const typeLabels = {
        'guest_name': '宿泊者名',
        'reservation_id': '予約ID',
        'phone': '電話番号',
        'email': 'メール'
      };
      
      return typeLabels[type] || type;
    };
    
    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.reservation-search-bar')) {
        showSuggestions.value = false;
      }
    };
    
    // Add and remove global event listeners
    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });
    
    onBeforeUnmount(() => {
      document.removeEventListener('click', handleClickOutside);
    });
    
    // Handle navigation events from SearchSuggestions component
    const handleSuggestionNavigation = (navigationInfo) => {
      // This method receives navigation events from the SearchSuggestions component
      // We can use this to update UI or perform additional actions when navigation occurs
      
      // Calculate overall index based on category and index
      let overallIndex = 0;
      const { category, index } = navigationInfo;
      
      if (category === 'recent') {
        // Recent searches are always first
        overallIndex = index;
      } else {
        // For other categories, we need to calculate the offset
        // This is a simplified version - in a real implementation, we would need to
        // know the exact structure of suggestions to calculate this correctly
        overallIndex = index;
        
        // Add any offsets from previous categories
        // This would need to be implemented based on the actual data structure
      }
      
      selectedSuggestionIndex.value = overallIndex;
    };

    return {
      localQuery,
      showSuggestions,
      selectedSuggestionIndex,
      onInput,
      onKeydown,
      selectSuggestion,
      clearSearch,
      removeFilter,
      clearAllFilters,
      getSuggestionTypeLabel,
      handleSuggestionNavigation,
      delayedLoading,
      onCompositionStart,
      onCompositionEnd
    };
  }
};
</script>

<style scoped>
.reservation-search-bar {
  position: relative;
  width: 100%;
}

.search-input-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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
}

.suggestion-list li:hover,
.suggestion-list li.selected {
  background-color: #f5f5f5;
}

.suggestion-type {
  font-size: 0.8em;
  color: #666;
  background: #eee;
  padding: 2px 6px;
  border-radius: 4px;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 8px;
  gap: 8px;
}

.filter-label {
  font-weight: bold;
  color: #555;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  background-color: #f0f7ff;
  border: 1px solid #cce5ff;
  color: #0066cc;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9em;
}

.filter-remove {
  cursor: pointer;
  font-size: 0.8em;
}

.filter-remove:hover {
  color: #ff3333;
}

.clear-all {
  color: #0066cc;
  cursor: pointer;
  font-size: 0.9em;
  text-decoration: underline;
}

.search-results-count {
  margin-top: 8px;
  font-size: 0.9em;
  color: #666;
}

.search-no-results {
  margin-top: 8px;
  font-size: 0.9em;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>