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
import { ref, computed, onMounted } from 'vue';
import FAQSearchBar from './FAQSearchBar.vue';
import FAQCategory from './FAQCategory.vue';

// Reactive state
const searchTerm = ref('');
const faqData = ref({ categories: [] });

// Load FAQ data
onMounted(async () => {
  try {
    // Load FAQ data from external JSON file
    const response = await fetch('/data/faq-content.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    faqData.value = data;
  } catch (error) {
    console.error('Failed to load FAQ data:', error);
    // Fallback to minimal static data if loading fails
    faqData.value = {
      categories: [
        {
          id: 'reservations',
          title: '予約管理',
          icon: 'pi-calendar',
          questions: [
            {
              id: 'add-reservation',
              question: '新しい予約を追加するにはどうすればよいですか？',
              answer: 'FAQデータの読み込みに失敗しました。ページを再読み込みしてください。',
              steps: [],
              tags: ['予約', '新規', '追加']
            }
          ]
        }
      ]
    };
  }
});

// Computed properties
const filteredCategories = computed(() => {
  if (!searchTerm.value) {
    return faqData.value.categories;
  }
  
  const term = searchTerm.value.toLowerCase();
  return faqData.value.categories
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