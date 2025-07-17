# Design Document

## Overview

This document describes the technical architecture for enhancing the reservation search and filtering experience in the RHT Hotel system. The design focuses on creating a powerful, intuitive search interface that supports flexible text matching, phonetic search capabilities, and global search accessibility through both the ReservationList component and a new global search feature in the TopMenu.

## Architecture

The enhanced search system follows a composable architecture with dedicated search functionality:

```
Search Architecture:
├── useReservationSearch.js (Core search composable)
├── usePhoneticSearch.js (Japanese text conversion utilities)
├── GlobalSearchModal.vue (TopMenu search interface)
├── ReservationSearchBar.vue (Enhanced search component)
└── SearchSuggestions.vue (Auto-complete and suggestions)

Integration Points:
├── TopMenu.vue (Global search access)
├── ReservationList.vue (Enhanced local search)
└── useReportStore.js (Extended API methods)
```

## Components and Interfaces

### Core Composables

**useReservationSearch** (Main Search Logic)
```javascript
interface ReservationSearchComposable {
  // State
  searchQuery: Ref<string>
  searchResults: Ref<Reservation[]>
  isSearching: Ref<boolean>
  searchSuggestions: Ref<string[]>
  savedSearches: Ref<SavedSearch[]>
  activeFilters: Ref<SearchFilter[]>
  
  // Methods
  performSearch: (query: string, filters?: SearchFilter[]) => Promise<void>
  clearSearch: () => void
  saveCurrentSearch: (name: string) => Promise<void>
  loadSavedSearch: (searchId: string) => Promise<void>
  deleteSavedSearch: (searchId: string) => Promise<void>
  
  // Advanced search
  searchWithOperators: (query: string) => Promise<void>
  fuzzySearch: (query: string, threshold?: number) => Promise<void>
  
  // Computed
  hasActiveSearch: ComputedRef<boolean>
  searchResultsCount: ComputedRef<number>
}
```

**usePhoneticSearch** (Japanese Text Processing)
```javascript
interface PhoneticSearchComposable {
  // Conversion methods
  hiraganaToKatakana: (text: string) => string
  katakanaToHiragana: (text: string) => string
  romajiToKana: (text: string) => string
  
  // Search matching
  phoneticMatch: (searchTerm: string, targetText: string) => boolean
  generateSearchVariants: (text: string) => string[]
  
  // Utilities
  normalizePhoneNumber: (phone: string) => string
  normalizeEmail: (email: string) => string
}
```

### UI Components

**GlobalSearchModal.vue** (TopMenu Search Interface)
```vue
<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '600px' }">
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-search"></i>
        <span>予約検索</span>
      </div>
    </template>
    
    <ReservationSearchBar 
      v-model="searchQuery"
      :suggestions="searchSuggestions"
      :is-searching="isSearching"
      @search="performSearch"
      @clear="clearSearch"
    />
    
    <SearchResults 
      :results="searchResults"
      :highlight-terms="searchQuery"
      @select="selectReservation"
    />
  </Dialog>
</template>
```

**ReservationSearchBar.vue** (Enhanced Search Input)
```vue
<template>
  <div class="search-container">
    <div class="search-input-wrapper">
      <InputText 
        v-model="localQuery"
        placeholder="予約ID、氏名、電話番号、メールアドレスで検索..."
        @input="onInput"
        @keydown="onKeydown"
      />
      <Button 
        icon="pi pi-search" 
        @click="performSearch"
        :loading="isSearching"
      />
    </div>
    
    <SearchSuggestions 
      v-if="showSuggestions"
      :suggestions="suggestions"
      @select="selectSuggestion"
    />
    
    <ActiveFilters 
      :filters="activeFilters"
      @remove="removeFilter"
      @clear-all="clearAllFilters"
    />
  </div>
</template>
```

### Enhanced API Layer

**Extended useReportStore Methods**
```javascript
// New search-specific API methods
const searchReservations = async (hotelId, searchParams) => {
  const { query, filters, fuzzy = false } = searchParams;
  
  const url = `/api/reservations/search/${hotelId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      filters,
      fuzzy,
      phoneticSearch: true
    })
  });
  
  return await response.json();
};

const getSearchSuggestions = async (hotelId, partialQuery) => {
  const url = `/api/reservations/search/suggestions/${hotelId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: partialQuery })
  });
  
  return await response.json();
};
```

## Data Models

### Search Models
```javascript
interface SearchFilter {
  field: string
  operator: 'equals' | 'contains' | 'between' | 'in'
  value: any
  label: string
}

interface SavedSearch {
  id: string
  name: string
  query: string
  filters: SearchFilter[]
  createdAt: Date
  userId: string
}

interface SearchResult {
  reservation: Reservation
  matchedFields: string[]
  highlightedText: { [field: string]: string }
  relevanceScore: number
}

interface SearchSuggestion {
  text: string
  type: 'guest_name' | 'reservation_id' | 'phone' | 'email'
  count: number
}
```

### Enhanced Reservation Model
```javascript
interface EnhancedReservation extends Reservation {
  // Search-specific computed fields
  searchableText: string
  phoneticVariants: string[]
  normalizedPhone: string
  normalizedEmail: string
}
```

## Error Handling

### Search Error Management
```javascript
class SearchError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.type = type; // 'network', 'validation', 'timeout', 'server'
    this.details = details;
  }
}

// Error handling in useReservationSearch
const handleSearchError = (error) => {
  if (error instanceof SearchError) {
    switch (error.type) {
      case 'network':
        toast.add({ severity: 'error', summary: 'ネットワークエラー', detail: '検索に失敗しました。接続を確認してください。' });
        break;
      case 'timeout':
        toast.add({ severity: 'warn', summary: 'タイムアウト', detail: '検索に時間がかかっています。条件を絞り込んでください。' });
        break;
      default:
        toast.add({ severity: 'error', summary: 'エラー', detail: error.message });
    }
  }
};
```

## Testing Strategy

### Unit Testing
- **useReservationSearch**: Test all search methods, filter combinations, and error scenarios
- **usePhoneticSearch**: Test Japanese text conversion accuracy and edge cases
- **Search components**: Test user interactions, keyboard navigation, and accessibility

### Integration Testing
- **Global search workflow**: Test search from TopMenu to reservation selection
- **Filter combinations**: Test complex filter scenarios and performance
- **Real-time suggestions**: Test debounced API calls and suggestion accuracy

### Performance Testing
- **Search response time**: Ensure sub-300ms response for typical queries
- **Large dataset handling**: Test with 10,000+ reservations
- **Memory usage**: Monitor for memory leaks in long search sessions

## Key Design Decisions

### 1. Phonetic Search Implementation
- **Client-side conversion**: Use JavaScript libraries for hiragana/katakana conversion to reduce server load
- **Server-side matching**: Implement fuzzy matching on the backend for better performance with large datasets
- **Caching strategy**: Cache phonetic variants to avoid repeated conversions

### 2. Global Search UX
- **Modal interface**: Use a modal for global search to maintain context while providing focus
- **Keyboard shortcuts**: Implement Ctrl+K/Cmd+K for quick access
- **Recent searches**: Show recent search history for quick re-access

### 3. Performance Optimization
- **Debounced search**: 300ms debounce for real-time search to balance responsiveness and server load
- **Result pagination**: Implement virtual scrolling for large result sets
- **Search caching**: Cache recent search results for 5 minutes to improve performance

### 4. Filter Architecture
- **Composable filters**: Allow combining multiple filter types (date, status, price, etc.)
- **Visual indicators**: Clear visual representation of active filters with easy removal
- **Saved searches**: Allow users to save and name complex filter combinations

### 5. Accessibility and Internationalization
- **Screen reader support**: Full ARIA labels and keyboard navigation
- **Japanese input support**: Proper handling of IME input and conversion
- **Mobile optimization**: Touch-friendly interface with responsive design

## Implementation Phases

### Phase 1: Core Search Infrastructure
- Implement useReservationSearch and usePhoneticSearch composables
- Create basic search API endpoints
- Add phonetic matching capabilities

### Phase 2: Enhanced UI Components
- Build ReservationSearchBar with suggestions
- Implement GlobalSearchModal for TopMenu
- Add filter management interface

### Phase 3: Advanced Features
- Implement saved searches functionality
- Add fuzzy search and search operators
- Optimize performance and add caching

### Phase 4: Integration and Polish
- Integrate with existing ReservationList component
- Add comprehensive error handling
- Implement accessibility features and testing