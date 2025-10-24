<template>
  <Dialog 
    :visible="visible" 
    modal 
    :style="{ width: '600px' }"
    :header="false"
    :closable="true"
    :dismissableMask="true"
    @hide="onHide"
    @update:visible="$emit('update:visible', $event)"
    @show="onDialogShow"
    class="global-search-modal"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-search"></i>
        <span>予約検索</span>
      </div>
    </template>
    
    <!-- Apply v-focustrap to the modal content -->
    <div class="search-container" v-focustrap>
      <ReservationSearchBar 
        ref="searchBarRef"
        v-model="searchQuery"
        :suggestions="searchSuggestions"
        :is-searching="isSearching"
        :active-filters="activeFilters"
        :search-results-count="searchResultsCount"
        @search="performSearch"
        @clear="clearSearch"
        @suggestion-selected="onSuggestionSelected"
        @remove-filter="removeFilter"
        @clear-filters="clearAllFilters"
        @close-modal="handleCloseModal"
      />
      
      <div v-if="searchResults.length > 0" class="search-results">
        <div class="search-results-header">
          <h3>検索結果</h3>
          <span v-if="searchResultsCount > 0" class="results-count">{{ searchResultsCount }}件</span>
        </div>
        
        <div class="search-results-list">
          <div 
            v-for="(reservation, index) in searchResults" 
            :key="reservation.reservation_id"
            class="search-result-item"
            :class="{ 'selected': selectedResultIndex === index }"
            @click="selectReservation(reservation)"
            @mouseenter="selectedResultIndex = index"
          >
            <div class="result-header">
              <span class="result-id">{{ reservation.reservation_id }}</span>
              <span class="result-status" :class="getStatusClass(reservation.status)">
                {{ getStatusLabel(reservation.status) }}
              </span>
            </div>
            
            <div class="result-name" v-html="highlightMatch(reservation.client_name, searchQuery)"></div>
            
            <div class="result-details">
              <div class="result-dates">
                <i class="pi pi-calendar"></i>
                {{ formatDate(reservation.check_in) }} - {{ formatDate(reservation.check_out) }}
              </div>
              
              <div class="result-contact" v-if="reservation.phone">
                <i class="pi pi-phone"></i>
                {{ reservation.phone }}
              </div>
              
              <div class="result-contact" v-if="reservation.email">
                <i class="pi pi-envelope"></i>
                {{ reservation.email }}
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="searchResults.length > 5" class="search-results-footer">
          <Button 
            label="すべての結果を表示" 
            class="p-button-text" 
            @click="showAllResults"
          />
        </div>
      </div>
      
      <div v-else-if="isSearching" class="search-loading">
        <i class="pi pi-spin pi-spinner"></i>
        <span>検索中...</span>
      </div>
      
      <div v-else-if="searchResultsCount === 0 && !isSearching && !showSuggestions" class="search-no-results">
        <i class="pi pi-info-circle"></i>
        <span>検索結果がありません</span>
      </div>
      
      <div v-else-if="!hasActiveSearch" class="search-instructions">
        <i class="pi pi-search"></i>
        <span>予約ID、氏名、電話番号、メールアドレスで検索できます</span>
        <div class="search-shortcuts">
          <div class="shortcut">
            <kbd>↑</kbd><kbd>↓</kbd>
            <span>候補を選択</span>
          </div>
          <div class="shortcut">
            <kbd>Enter</kbd>
            <span>選択を確定</span>
          </div>
          <div class="shortcut">
            <kbd>Esc</kbd>
            <span>閉じる</span>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { Dialog, Button } from 'primevue';
import ReservationSearchBar from '../../../components/ReservationSearchBar.vue';
import { useReservationSearch } from '../../../composables/useReservationSearch';
import { usePhoneticSearch } from '../../../composables/usePhoneticSearch';
import accessibilityService from '../../../services/AccessibilityService';

export default {
  name: 'GlobalSearchModal',
  
  components: {
    Dialog,
    Button,
    ReservationSearchBar
  },
  
  props: {
    /**
     * Controls the visibility of the modal
     */
    visible: {
      type: Boolean,
      default: false
    },
    showSuggestions: {
      type: Boolean,
      default: false
    }
  },
  
  emits: [
    'update:visible',
    'select-reservation'
  ],
  
  setup(props, { emit }) {
    const router = useRouter();
    
    // Initialize search composable
    const {
      searchQuery,
      searchResults,
      isSearching,
      searchSuggestions,
      activeFilters,
      searchError,
      hasActiveSearch,
      searchResultsCount,
      performSearch,
      clearSearch,
      removeFilter,
      clearAllFilters,
      _getSearchSuggestions
    } = useReservationSearch();
    
    // Initialize phonetic search for highlighting
    const { phoneticMatch } = usePhoneticSearch();
    
    // Local state
    const selectedResultIndex = ref(-1);
    
    // Add a ref for the ReservationSearchBar
    const searchBarRef = ref(null);
    
    const onDialogShow = () => {
      nextTick(() => {
        if (searchBarRef.value && searchBarRef.value.focusInput) {
          searchBarRef.value.focusInput();
        }
      });
    };

    // Watch for visibility changes
    watch(() => props.visible, (newVisible) => {
      if (newVisible) {
        // Announce to screen readers
        accessibilityService.announce('グローバル検索モーダルが開きました。予約を検索できます。', 'assertive');
      } else {
        // Clear search when modal closes
        clearSearch();
        selectedResultIndex.value = -1;
      }
    });
    
    // Watch for search results to announce to screen readers
    watch(searchResults, (newResults) => {
      if (hasActiveSearch.value) {
        accessibilityService.announceSearchResults(newResults.length, searchQuery.value);
      }
    });
    
    // Watch for loading state to announce to screen readers
    watch(isSearching, (newIsSearching) => {
      accessibilityService.announceLoadingState(newIsSearching, searchQuery.value);
    });

    // Handle keyboard navigation for search results
    const handleKeydown = (event) => {
      if (!props.visible || searchResults.value.length === 0) return;
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          selectedResultIndex.value = (selectedResultIndex.value + 1) % searchResults.value.length;
          announceSelectedResult();
          break;
          
        case 'ArrowUp':
          event.preventDefault();
          selectedResultIndex.value = selectedResultIndex.value <= 0 
            ? searchResults.value.length - 1 
            : selectedResultIndex.value - 1;
          announceSelectedResult();
          break;
          
        case 'Enter':
          event.preventDefault();
          if (selectedResultIndex.value >= 0) {
            selectReservation(searchResults.value[selectedResultIndex.value]);
          }
          break;
          
        case 'Escape':
          event.preventDefault();
          closeModal();
          break;
      }
    };
    
    // Announce selected result to screen readers
    const announceSelectedResult = () => {
      if (selectedResultIndex.value >= 0 && selectedResultIndex.value < searchResults.value.length) {
        const reservation = searchResults.value[selectedResultIndex.value];
        accessibilityService.announce(
          `${selectedResultIndex.value + 1}/${searchResults.value.length}: ${reservation.client_name}, ${getStatusLabel(reservation.status)}, ${formatDate(reservation.check_in)}から${formatDate(reservation.check_out)}まで`,
          'polite'
        );
      }
    };
    
    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch (_error) {
        return dateString;
      }
    };
    
    // Get status label
    const getStatusLabel = (status) => {
      const statusLabels = {
        'confirmed': '確認済',
        'pending': '保留中',
        'cancelled': 'キャンセル',
        'checked_in': 'チェックイン済',
        'checked_out': 'チェックアウト済',
        'no_show': 'ノーショー'
      };
      
      return statusLabels[status] || status;
    };
    
    // Get status class for styling
    const getStatusClass = (status) => {
      const statusClasses = {
        'confirmed': 'status-confirmed',
        'pending': 'status-pending',
        'cancelled': 'status-cancelled',
        'checked_in': 'status-checked-in',
        'checked_out': 'status-checked-out',
        'no_show': 'status-no-show'
      };
      
      return statusClasses[status] || '';
    };
    
    // Highlight matching text
    const highlightMatch = (text, query) => {
      if (!text || !query) return text;
      
      // Split query into terms
      const terms = query.trim().split(/\s+/);
      let result = text;
      
      // Highlight each term
      terms.forEach(term => {
        if (term.length < 2) return; // Skip short terms
        
        // Try to find the term in the text (case insensitive)
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        if (regex.test(result)) {
          result = result.replace(regex, '<mark>$1</mark>');
        } else {
          // Try phonetic matching
          const words = text.split(/\s+/);
          for (const word of words) {
            if (phoneticMatch(term, word)) {
              const wordRegex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
              result = result.replace(wordRegex, '<mark>$1</mark>');
            }
          }
        }
      });
      
      return result;
    };
    
    // Handle suggestion selection
    const onSuggestionSelected = (suggestion) => {
      // Reset selected result index
      selectedResultIndex.value = -1;
      if (suggestion && suggestion.reservation_id) {
        selectReservation(suggestion);
      }
    };
    
    // Select a reservation
    const selectReservation = (reservation) => {
      emit('select-reservation', reservation);
      
      // Navigate to reservation details
      router.push({
        name: 'ReservationEdit',
        params: { reservation_id: reservation.reservation_id }
      }).then(() => {
        console.debug('[GlobalSearchModal] Route navigation complete, emitting close-modal');
        emit('update:visible', false);
      });
      
      // Announce to screen readers
      accessibilityService.announce(
        `${reservation.client_name}の予約詳細ページに移動しました。`,
        'assertive'
      );
    };
    
    // Show all results in reservation list
    const showAllResults = () => {
      // Navigate to reservation list with current search query
      router.push({
        name: 'ReservationList',
        query: { search: searchQuery.value }
      });
      
      // Close the modal
      closeModal();
      
      // Announce to screen readers
      accessibilityService.announce(
        `予約一覧ページに移動しました。検索結果: ${searchResultsCount.value}件`,
        'assertive'
      );
    };
    
    // Close the modal
    const closeModal = () => {
      emit('update:visible', false);
    };
    
    // Handle modal hide event
    const onHide = () => {
      closeModal();
    };
    
    // Register global keyboard shortcut
    const registerKeyboardShortcut = () => {
      const handleGlobalKeydown = (event) => {
        // Ctrl+K or Cmd+K to open search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
          event.preventDefault();
          emit('update:visible', true);
        }
      };
      
      document.addEventListener('keydown', handleGlobalKeydown);
      
      return () => {
        document.removeEventListener('keydown', handleGlobalKeydown);
      };
    };

    const handleCloseModal = () => {
      console.debug('[GlobalSearchModal] handleCloseModal called, closing modal');
      emit('update:visible', false);
    };
    
    // Lifecycle hooks
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
      const removeGlobalShortcut = registerKeyboardShortcut();
      
      return () => {
        document.removeEventListener('keydown', handleKeydown);
        removeGlobalShortcut();
      };
    });
    
    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeydown);
    });
    
    return {
      // Search state
      searchQuery,
      searchResults,
      isSearching,
      searchSuggestions,
      activeFilters,
      searchError,
      hasActiveSearch,
      searchResultsCount,
      
      // Search methods
      performSearch,
      clearSearch,
      removeFilter,
      clearAllFilters,
      
      // Result handling
      selectedResultIndex,
      selectReservation,
      showAllResults,
      
      // Utilities
      formatDate,
      getStatusLabel,
      getStatusClass,
      highlightMatch,
      onSuggestionSelected,
      onHide,
      handleCloseModal,
      searchBarRef,
      onDialogShow
    };
  }
};
</script>

<style scoped>
.search-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-results {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.search-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.search-results-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.results-count {
  font-size: 0.875rem;
  color: #666;
}

.search-results-list {
  max-height: 400px;
  overflow-y: auto;
}

.search-result-item {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover,
.search-result-item.selected {
  background-color: #f0f7ff;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.result-id {
  font-size: 0.875rem;
  color: #666;
}

.result-status {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.status-confirmed {
  background-color: #e3f2fd;
  color: #0277bd;
}

.status-pending {
  background-color: #fff8e1;
  color: #ff8f00;
}

.status-cancelled {
  background-color: #ffebee;
  color: #c62828;
}

.status-checked-in {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-checked-out {
  background-color: #e0f2f1;
  color: #00796b;
}

.status-no-show {
  background-color: #fce4ec;
  color: #ad1457;
}

.result-name {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.result-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.875rem;
  color: #666;
}

.result-dates,
.result-contact {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-results-footer {
  padding: 8px;
  text-align: center;
  border-top: 1px solid #e0e0e0;
}

.search-loading,
.search-no-results,
.search-instructions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: #666;
  gap: 8px;
}

.search-loading i,
.search-no-results i,
.search-instructions i {
  font-size: 2rem;
  margin-bottom: 8px;
}

.search-shortcuts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
}

.shortcut {
  display: flex;
  align-items: center;
  gap: 8px;
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 0.75rem;
  font-family: monospace;
  line-height: 1;
  color: #444;
  background-color: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
}

/* Dark mode styles */
:global(.dark) .search-results {
  border-color: #444;
}

:global(.dark) .search-results-header {
  background-color: #333;
  border-color: #444;
}

:global(.dark) .search-result-item {
  border-color: #444;
}

:global(.dark) .search-result-item:hover,
:global(.dark) .search-result-item.selected {
  background-color: #2a2a2a;
}

:global(.dark) .search-results-footer {
  border-color: #444;
}

:global(.dark) kbd {
  color: #eee;
  background-color: #333;
  border-color: #555;
}

/* Highlight styles */
:deep(mark) {
  background-color: rgba(255, 213, 79, 0.4);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

:global(.dark) :deep(mark) {
  background-color: rgba(255, 213, 79, 0.2);
}
</style>