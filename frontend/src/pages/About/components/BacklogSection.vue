<template>
  <div class="backlog-section">
    <h2 class="text-xl font-bold mb-4 flex items-center">
      <i class="pi pi-list-check text-blue-500 mr-2" /> バックログ
    </h2>
    <div v-if="backlog && backlog.length" class="grid gap-4">
      <Card v-for="(item, idx) in backlog" :key="idx" class="backlog-card">
        <template #content>
          <div class="flex items-start gap-3">
            <i class="pi pi-asterisk text-blue-400 mt-1" />
            <span class="text-base text-gray-800 dark:text-gray-100">{{ item.description }}</span>
          </div>
        </template>
      </Card>
    </div>
    <p v-else class="text-gray-500">バックログはありません。</p>
  </div>
</template>

<script setup>
import changelogData from '../data/changelog-ja.json';
import Card from 'primevue/card';
const backlog = changelogData.backlog;
</script>

<style scoped>
.backlog-section {
  max-width: 48rem;
  margin: 0 auto;
}
.backlog-card {
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  border-radius: 0.75rem;
}
</style> 