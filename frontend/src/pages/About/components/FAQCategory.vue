<template>
  <div class="faq-category mb-8">
    <div class="category-header mb-4">
      <h2 class="text-2xl font-semibold text-gray-800 dark:text-white flex items-center">
        <i :class="category.icon" class="mr-3 text-blue-600 dark:text-blue-400"></i>
        {{ category.title }}
      </h2>
    </div>
    
    <div class="questions-list">
      <Accordion :multiple="true">
        <AccordionTab
          v-for="question in category.questions"
          :key="question.id"
          :header="question.question"
        >
          <div class="question-content">
            <p class="mb-4 text-gray-700 dark:text-gray-300">{{ question.answer }}</p>
            
            <div v-if="question.steps && question.steps.length > 0" class="steps-list">
              <h4 class="font-semibold mb-3 text-gray-800 dark:text-white">手順:</h4>
              <ol class="list-decimal list-inside space-y-2">
                <li
                  v-for="(step, index) in question.steps"
                  :key="index"
                  class="text-gray-700 dark:text-gray-300 pl-2"
                  v-html="highlightSearchTerm(step)"
                >
                </li>
              </ol>
            </div>
            
            <!-- Tags -->
            <div v-if="question.tags && question.tags.length > 0" class="tags mt-4">
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in question.tags"
                  :key="tag"
                  class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </AccordionTab>
      </Accordion>
    </div>
  </div>
</template>

<script setup>
import { Accordion, AccordionTab } from 'primevue';

// Props
const props = defineProps({
  category: {
    type: Object,
    required: true
  },
  searchTerm: {
    type: String,
    default: ''
  }
});

// Methods
const highlightSearchTerm = (text) => {
  if (!props.searchTerm) return text;
  
  const regex = new RegExp(`(${props.searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600">$1</mark>');
};
</script>

<style scoped>
.faq-category {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  background: white;
}

:global(.dark) .faq-category {
  border-color: #374151;
  background: #1f2937;
}

/* Custom accordion styling */
:deep(.p-accordion-header-link) {
  padding: 1rem 1.25rem;
  font-weight: 500;
  color: #374151;
  border-radius: 0.5rem;
}

:deep(.p-accordion-header-link:hover) {
  background: #f9fafb;
}

:deep(.p-accordion-content) {
  padding: 1.25rem;
  border-top: 1px solid #e5e7eb;
}

/* Dark mode accordion styles */
:global(.dark) :deep(.p-accordion-header-link) {
  color: #d1d5db;
  background: #374151;
}

:global(.dark) :deep(.p-accordion-header-link:hover) {
  background: #4b5563;
}

:global(.dark) :deep(.p-accordion-content) {
  border-top-color: #4b5563;
  background: #374151;
}

/* Highlight styles */
:deep(mark) {
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
</style>