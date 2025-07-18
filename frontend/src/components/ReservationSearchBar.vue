<template>
  <div class="reservation-search-bar">
    <div class="search-input-wrapper">
      <span class="p-input-icon-left p-input-icon-right w-full">
        <i class="pi pi-search" />
        <InputText
          v-model="localQuery"
          class="w-full"
          placeholder="予約ID、氏名、電話番号、メールアドレスで検索..."
          @input="onInput"
          @keydown="onKeydown"
          :disabled="disabled"
          aria-label="予約検索"
        />
        <i v-if="isSearching" class="pi pi-spin pi-spinner" />
        <i v-else-if="localQuery && !disabled" class="pi pi-times cursor-pointer" @click="clearSearch" />
      </span>
    </div>

    <!-- Search suggestions dropdown -->
    <div v-if="showSuggestions && suggestions.length > 0" class="search-suggestions">
      <ul class="suggestion-list">
        <li
          v-for="(suggestion, index) in suggestions"
          :key="index"
          :class="{ 'selected': selectedSuggestionIndex === index }"
          @click="selectSuggestion(suggestion)"
          @mouseenter="selectedSuggestionIndex = index"
        >
          <span class="suggestion-text">{{ suggestion.text }}</span>
          <span v-if="suggestion.type" class="suggestion-type">{{ getSuggestionTypeLabel(suggestion.type) }}</span>
        </li>
      </ul>
    </div>

    <!-- Active filters display -->
    <div v-if="activeFilters.length > 0" class="active-filters">
      <span class="filter-label">フィルター:</span>
      <div class="filter-tags">
        <span v-for="(filter, index) in activeFilters" :key="index" class="filter-tag">
          {{ filter.label }}
          <i class="pi pi-times filter-remove" @click="removeFilter(filter.field)" />
        </span>
        <span class="clear-all" @click="clearAllFilters">すべてクリア</span>
      </div>
    </div>

    <!-- Search results count -->
    <div v-if="searchResultsCount !== null && !isSearching" class="search-results-count">
      {{ searchResultsCount }}件の検索結果
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useReservationSearch } from '../composables/useReservationSearch';

export default {
  name: 'ReservationSearchBar',
  
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
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        emit('search', localQuery.value);
        
        // Show suggestions if query is not empty
        showSuggestions.value = localQuery.value.trim().length > 0;
      }, 300); // 300ms debounce
    };
    
    // Handle keyboard navigation
    const onKeydown = (event) => {
      if (!showSuggestions.value || props.suggestions.length === 0) {
        if (event.key === 'Enter') {
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
      localQuery.value = suggestion.text;
      emit('suggestion-selected', suggestion);
      showSuggestions.value = false;
      selectedSuggestionIndex.value = -1;
      
      // Trigger search with the selected suggestion
      emit('search', suggestion.text);
    };
    
    // Clear search
    const clearSearch = () => {
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
      getSuggestionTypeLabel
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

.cursor-pointer {
  cursor: pointer;
}
</style>