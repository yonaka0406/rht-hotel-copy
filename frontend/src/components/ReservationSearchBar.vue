<template>
  <div v-focustrap class="reservation-search-bar px-2 py-2 sm:px-4 sm:py-2" role="search" ref="searchBarRef">
    <div class="search-input-wrapper mb-2 sm:mb-0">
      <span class="search-input-flex w-full">
        <i class="pi pi-search search-icon" />
        <InputText
          ref="inputRef"
          v-model="localQuery"
          class="w-full min-h-[44px] px-9"
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
          autofocus
        />
        <i v-if="delayedLoading" class="pi pi-spin pi-spinner clear-icon" />
        <i v-else-if="localQuery && !disabled" class="pi pi-times cursor-pointer clear-icon" @click="clearSearch" />
      </span>
    </div>

    <!-- Search suggestions dropdown rendered via teleport -->
    <teleport to="body">
      <ul
        v-if="showSuggestions && props.suggestions.length > 0"
        class="search-suggestions absolute z-50 bg-white border border-gray-200 rounded shadow"
        :style="suggestionDropdownStyle"
        role="listbox"
        :aria-activedescendant="'suggestion-' + selectedSuggestionIndex"
      >
        <li
          v-for="(suggestion, idx) in props.suggestions"
          :key="idx"
          :id="'suggestion-' + idx"
          :class="['px-3 py-2 cursor-pointer', { 'bg-blue-100': idx === selectedSuggestionIndex } ]"
          @mousedown.prevent="selectSuggestion(suggestion)"
          @mouseenter="selectedSuggestionIndex = idx"
          role="option"
          :aria-selected="idx === selectedSuggestionIndex"
        >
          <span class="suggestion-text">
            <div class="suggestion-main">
              <span class="client-name">{{ suggestion.name_kanji || suggestion.name_kana || suggestion.name || '' }}</span>
              <span v-if="suggestion.email" class="client-email">{{ suggestion.email }}</span>
            </div>
            <div class="suggestion-details">
              <span v-if="suggestion.check_in && suggestion.check_out" class="reservation-dates">
                [{{ formatJpDate(suggestion.check_in) }} → {{ formatJpDate(suggestion.check_out) }}]
              </span>
              <span v-else-if="suggestion.check_in" class="reservation-dates">
                [{{ formatJpDate(suggestion.check_in) }}]
              </span>
              <span v-else-if="suggestion.check_out" class="reservation-dates">
                [→ {{ formatJpDate(suggestion.check_out) }}]
              </span>
              <span v-if="suggestion.number_of_people" class="reservation-people">
                ({{ suggestion.number_of_people }}名)
              </span>
            </div>
          </span>
        </li>
      </ul>
    </teleport>

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

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount, defineExpose } from 'vue';
import { useReservationSearch } from '../composables/useReservationSearch';
import SearchSuggestions from './SearchSuggestions.vue';
import { InputText } from 'primevue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  suggestions: { type: Array, default: () => [] },
  isSearching: { type: Boolean, default: false },
  activeFilters: { type: Array, default: () => [] },
  searchResultsCount: { type: Number, default: null },
  disabled: { type: Boolean, default: false }
});
const emit = defineEmits([
  'update:modelValue',
  'search',
  'clear',
  'suggestion-selected',
  'remove-filter',
  'clear-filters',
  'close-modal'
]);

const localQuery = ref(props.modelValue);
const showSuggestions = ref(false);
const selectedSuggestionIndex = ref(-1);
const delayedLoading = ref(false);
let loadingTimer = null;
const isComposing = ref(false);

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

let debounceTimer = null;
watch(() => props.modelValue, (newValue) => {
  localQuery.value = newValue;
});
watch(localQuery, (newValue) => {
  emit('update:modelValue', newValue);
});

const onInput = () => {
  if (isComposing.value) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  console.debug('[ReservationSearchBar] onInput:', localQuery.value);
  debounceTimer = setTimeout(() => {
    console.debug('[ReservationSearchBar] emit search:', localQuery.value);
    emit('search', localQuery.value);
    showSuggestions.value = localQuery.value.trim().length > 0;
  }, 300);
};

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

const selectSuggestion = (suggestion) => {
  const query = suggestion.ota_reservation_id || suggestion.name || suggestion.name_kanji || suggestion.name_kana || suggestion.email || '';
  localQuery.value = query;
  emit('suggestion-selected', suggestion);
  showSuggestions.value = false;
  selectedSuggestionIndex.value = -1;
  emit('search', query);
};

const clearSearch = () => {
  console.debug('[ReservationSearchBar] clearSearch');
  localQuery.value = '';
  showSuggestions.value = false;
  selectedSuggestionIndex.value = -1;
  emit('clear');
};
const removeFilter = (field) => {
  emit('remove-filter', field);
};
const clearAllFilters = () => {
  emit('clear-filters');
};
const getSuggestionTypeLabel = (type) => {
  const typeLabels = {
    'guest_name': '宿泊者名',
    'reservation_id': '予約ID',
    'phone': '電話番号',
    'email': 'メール'
  };
  return typeLabels[type] || type;
};
const handleClickOutside = (event) => {
  if (!event.target.closest('.reservation-search-bar')) {
    showSuggestions.value = false;
  }
};
const searchBarRef = ref(null);
const suggestionDropdownStyle = ref({});

function updateSuggestionDropdownPosition() {
  nextTick(() => {
    if (!showSuggestions.value || !searchBarRef.value) return;
    const inputEl = searchBarRef.value.querySelector('input');
    if (!inputEl) return;
    const rect = inputEl.getBoundingClientRect();
    suggestionDropdownStyle.value = {
      position: 'absolute',
      top: `${rect.bottom + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      maxHeight: '60vh',
      overflowY: 'auto',
      minWidth: '220px',
      zIndex: 9999
    };
  });
}

watch([showSuggestions, () => props.suggestions.length], ([show, len]) => {
  if (show && len > 0) updateSuggestionDropdownPosition();
});
onMounted(() => {
  window.addEventListener('resize', updateSuggestionDropdownPosition);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateSuggestionDropdownPosition);
});
const handleSuggestionNavigation = (navigationInfo) => {
  let overallIndex = 0;
  const { category, index } = navigationInfo;
  if (category === 'recent') {
    overallIndex = index;
  } else {
    overallIndex = index;
  }
  selectedSuggestionIndex.value = overallIndex;
};
const inputRef = ref(null);
function focusInput() {
  nextTick(() => {
    let el = null;
    if (inputRef.value) {
      // Try PrimeVue InputText
      if (inputRef.value.$el) {
        el = inputRef.value.$el.querySelector('input');
      }
      // Try direct DOM input
      if (!el && inputRef.value instanceof HTMLInputElement) {
        el = inputRef.value;
      }
    }
    console.debug('[ReservationSearchBar] focusInput el:', el, 'inputRef.value:', inputRef.value);
    if (el && typeof el.focus === 'function') {
      el.focus();
      // Try again after a short delay in case the input is not yet ready
      setTimeout(() => el.focus(), 50);
    }
  });
}
defineExpose({ focusInput });
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
  /* Remove left/right/width/max-width from here, handled inline */
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
.suggestion-main {
  display: flex;
  gap: 12px;
  align-items: center;
  font-weight: 500;
}
.client-name {
  color: #222;
}
.client-email {
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
.reservation-dates, .reservation-people {
  margin-right: 8px;
}
@media (max-width: 600px) {
  .search-suggestions {
    left: 0;
    right: 0;
    min-width: 0;
    width: 98vw;
    max-width: 98vw;
  }
}
.search-input-flex {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
}
.search-icon {
  position: absolute;
  left: 16px;
  font-size: 1.2rem;
  color: #888;
  z-index: 2;
  pointer-events: none;
}
.clear-icon {
  position: absolute;
  right: 16px;
  font-size: 1.2rem;
  color: #888;
  z-index: 2;
  cursor: pointer;
}
.search-input-flex input {
  padding-left: 2.2rem;
  padding-right: 2.2rem;
}
</style>