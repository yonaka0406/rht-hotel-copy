<template>
  <div class="saved-searches" role="navigation" aria-label="保存済み検索">
    <div class="flex items-center mb-2">
      <span class="font-bold mr-2">保存済み検索</span>
      <Button label="新規保存" icon="pi pi-plus" size="small" @click="$emit('add')" class="mr-2" aria-label="新規保存" />
    </div>
    <div v-if="loading">読み込み中...</div>
    <div v-else-if="error" class="text-red-500">{{ error }}</div>
    <div v-else>
      <div v-for="(group, category) in groupedSearches" :key="category" class="mb-2" role="group" :aria-label="category + 'グループ'">
        <div class="font-semibold text-sm text-gray-600 mb-1">{{ category }}</div>
        <ul class="list-none p-0 m-0" role="list">
          <li v-for="search in group" :key="search.id" class="flex items-center mb-1" role="listitem">
            <Button :label="search.name" size="small" class="mr-2" @click="$emit('select', search)" :aria-label="search.name + 'を選択'" />
            <Button :icon="search.favorite ? 'pi pi-star-fill' : 'pi pi-star'" size="small" text @click="$emit('toggle-favorite', search)" class="mr-1" :severity="search.favorite ? 'warning' : undefined" v-tooltip="search.favorite ? 'お気に入り' : 'お気に入りに追加'" :aria-label="search.favorite ? 'お気に入り解除' : 'お気に入りに追加'" />
            <Button icon="pi pi-pencil" size="small" text @click="$emit('edit', search)" class="mr-1" aria-label="編集" />
            <Button icon="pi pi-trash" size="small" text severity="danger" @click="$emit('delete', search)" aria-label="削除" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import Button from 'primevue/button'
import { useSavedSearch } from '@/composables/useSavedSearch'

const { savedSearches, loading, error, fetchAll } = useSavedSearch()

onMounted(() => {
  fetchAll()
})

const groupedSearches = computed(() => {
  const groups = {}
  for (const search of savedSearches.value) {
    const cat = search.category && search.category.trim() ? search.category : '未分類'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(search)
  }
  return groups
})
</script>

<style scoped>
.saved-searches {
  min-width: 220px;
}
</style> 