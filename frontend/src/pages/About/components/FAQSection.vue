<template>
  <div class="faq-section">
    <FAQSearchBar @search="handleSearch" />
    
    <div class="faq-categories mt-6">
      <FAQCategory 
        v-for="category in filteredCategories" 
        :key="category.id"
        :category="category"
        :search-term="searchTerm"
      />
    </div>
    
    <!-- No results message -->
    <div v-if="filteredCategories.length === 0 && searchTerm" class="text-center py-8">
      <i class="pi pi-search text-4xl text-gray-400 mb-4"></i>
      <p class="text-gray-600 dark:text-gray-300">「{{ searchTerm }}」に関する結果が見つかりませんでした。</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">別のキーワードで検索してみてください。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import FAQSearchBar from './FAQSearchBar.vue';
import FAQCategory from './FAQCategory.vue';
import faqData from '../data/faq-content.json';

// Reactive state
const searchTerm = ref('');

// Computed properties
const filteredCategories = computed(() => {
  if (!searchTerm.value) {
    return faqData.categories;
  }
  
  const term = searchTerm.value.toLowerCase();
  return faqData.categories
    .map(category => ({
      ...category,
      questions: category.questions.filter(question => 
        question.question.toLowerCase().includes(term) ||
        question.answer.toLowerCase().includes(term) ||
        question.steps.some(step => step.toLowerCase().includes(term)) ||
        question.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }))
    .filter(category => category.questions.length > 0);
});

// Methods
const handleSearch = (term) => {
  searchTerm.value = term;
};
</script>

<style scoped>
.faq-section {
  max-width: 4xl;
}
</style>