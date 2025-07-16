<template>
  <div class="about-container p-4 sm:p-6 max-w-6xl mx-auto">
    <div class="about-header mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">システムヘルプ</h1>
      <p class="text-gray-600 dark:text-gray-300 text-sm sm:text-base">システムの使用方法と最新の更新情報をご確認いただけます。</p>
    </div>
    
    <TabView>
      <TabPanel header="よくある質問" aria-label="よくある質問セクション">
        <FAQSection />
      </TabPanel>
      <TabPanel header="更新履歴" aria-label="更新履歴セクション">
        <ChangelogSection />
      </TabPanel>
    </TabView>
  </div>
</template>

<script setup>
import { TabView, TabPanel } from 'primevue';
import FAQSection from './components/FAQSection.vue';
import ChangelogSection from './components/ChangelogSection.vue';
</script>

<style scoped>
.about-container {
  min-height: calc(100vh - 120px);
}

/* Custom styling for tabs */
:deep(.p-tabview-nav) {
  background: transparent;
  border-bottom: 2px solid #e5e7eb;
}

:deep(.p-tabview-nav-link) {
  padding: 1rem 1.5rem;
  font-weight: 500;
  color: #6b7280;
  border: none;
  background: transparent;
}

:deep(.p-tabview-nav-link:hover) {
  color: #374151;
  background: #f9fafb;
}

:deep(.p-tabview-selected .p-tabview-nav-link) {
  color: #3b82f6;
  border-bottom: 2px solid #3b82f6;
}

/* Dark mode styles */
:global(.dark) :deep(.p-tabview-nav) {
  border-bottom-color: #374151;
}

:global(.dark) :deep(.p-tabview-nav-link) {
  color: #9ca3af;
}

:global(.dark) :deep(.p-tabview-nav-link:hover) {
  color: #d1d5db;
  background: #374151;
}

:global(.dark) :deep(.p-tabview-selected .p-tabview-nav-link) {
  color: #60a5fa;
  border-bottom-color: #60a5fa;
}
</style>