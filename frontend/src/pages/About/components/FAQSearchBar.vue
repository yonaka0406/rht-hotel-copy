<template>
  <div class="faq-search-bar">
    <div class="search-container">
      <IconField iconPosition="left">
        <InputIcon class="pi pi-search" />
        <InputText
          id="faq-search"
          v-model="searchQuery"
          placeholder="質問やキーワードを検索..."
          class="w-full"
          @input="onSearchInput"
          aria-label="FAQ検索"
          role="searchbox"
          fluid
        />
      </IconField>
      <Button
        v-if="searchQuery"
        icon="pi pi-times"
        class="p-button-text p-button-sm ml-2"
        @click="clearSearch"
        aria-label="検索をクリア"
      />
    </div>
    
    <!-- Search suggestions/hints -->
    <div v-if="!searchQuery" class="search-hints mt-3">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">よく検索されるキーワード:</p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="hint in searchHints"
          :key="hint"
          :label="hint"
          class="p-button-outlined p-button-sm"
          @click="setSearchTerm(hint)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { InputText, Button, IconField, InputIcon } from 'primevue';

// Define emits
const emit = defineEmits(['search']);

// Reactive state
const searchQuery = ref('');

// Search hints
const searchHints = [
  '予約追加',
  '予約編集',
  '顧客登録',
  'レポート',
  'エクスポート',
  'カレンダー'
];

// Methods
const onSearchInput = () => {
  emit('search', searchQuery.value);
};

const clearSearch = () => {
  searchQuery.value = '';
  emit('search', '');
};

const setSearchTerm = (term) => {
  searchQuery.value = term;
  emit('search', term);
};
</script>

<style scoped>
.search-container {
  display: flex;
  align-items: center;
  max-width: 600px;
  width: 100%;
}

.search-hints {
  max-width: 600px;
}

/* Custom input styling */
:deep(.p-inputtext) {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border-radius: 0.5rem;
}

:deep(.p-inputtext:focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Dark mode styles */
:global(.dark) :deep(.p-inputtext) {
  background-color: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

:global(.dark) :deep(.p-inputtext:focus) {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}
</style>