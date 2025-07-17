<template>
  <div class="about-container p-4 sm:p-6 max-w-6xl mx-auto">
    <div class="about-header mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">システムヘルプ</h1>
      <p class="text-gray-600 dark:text-gray-300 text-sm sm:text-base">システムの使用方法と最新の更新情報をご確認いただけます。</p>
    </div>
    <Button 
      label="ホームに戻る"
      icon="pi pi-home"
      class="p-button-sm mb-4"
      @click="goHome"
    />
    <Tabs 
      :value="activeTab"
      @update:value="onTabChange"
      class="mt-6"
    >
      <TabList>
        <Tab :value="0">よくある質問</Tab>
        <Tab :value="1">更新履歴</Tab>
        <Tab :value="2">バックログ</Tab>
      </TabList>
      <TabPanels>
        <TabPanel :value="0">
          <FAQSection />
        </TabPanel>
        <TabPanel :value="1">
          <ChangelogSection />
        </TabPanel>
        <TabPanel :value="2">
          <BacklogSection />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import FAQSection from './components/FAQSection.vue';
import ChangelogSection from './components/ChangelogSection.vue';
import BacklogSection from './components/BacklogSection.vue';

const activeTab = ref(0);
const router = useRouter();
const goHome = () => router.push('/');
const onTabChange = (val) => { activeTab.value = val; };
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