<template>
  <div class="changelog-section">
    <div class="changelog-filters mb-6">
      <div class="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
        <div class="filter-group w-full sm:w-auto">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="version-select">
            バージョン:
          </label>
          <Select
            id="version-select"
            v-model="selectedVersion"
            :options="versionOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="すべてのバージョン"
            class="w-full sm:w-48"
            aria-label="バージョンを選択"
            clearable
          />
        </div>
        
        <div class="filter-group w-full sm:w-auto">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="type-select">
            変更タイプ:
          </label>
          <Select
            id="type-select"
            v-model="selectedType"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="すべてのタイプ"
            class="w-full sm:w-48"
            aria-label="変更タイプを選択"
            clearable
          />
        </div>
        <Button
          :label="sortOrder === 'desc' ? '新しい順' : '古い順'"
          :icon="sortOrder === 'desc' ? 'pi pi-sort-amount-down' : 'pi pi-sort-amount-up'"
          class="p-button-outlined p-button-sm w-full sm:w-auto mt-2 sm:mt-0"
          @click="toggleSortOrder"
          aria-label="表示順を切り替え"
        />
        <Button
          v-if="selectedVersion || selectedType"
          label="フィルターをクリア"
          icon="pi pi-filter-slash"
          class="p-button-outlined p-button-sm w-full sm:w-auto mt-2 sm:mt-0"
          @click="clearFilters"
          aria-label="選択したフィルターをクリア"
        />
      </div>
    </div>
    
    <div class="changelog-entries">
      <div v-if="filteredEntries.length > 0">
        <div v-for="group in groupedEntries" :key="group.year" class="year-group mb-10">
          <h2 class="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
            <i class="pi pi-calendar text-blue-600 dark:text-blue-400 mr-3 text-2xl"></i>
            {{ group.year }}年
          </h2>
          
          <div
            v-for="entry in group.entries"
            :key="entry.version"
            class="changelog-entry mb-6 p-6 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div class="entry-header mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 class="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                  <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 py-1 px-3 rounded-full text-sm mr-3 font-mono">
                    v{{ entry.version }}
                  </span>
                </h3>
                <span class="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center">
                  <i class="pi pi-clock mr-1 text-xs"></i>
                  {{ formatDate(entry.date) }}
                </span>
              </div>
            </div>
            
            <div class="changes space-y-3">
              <div
                v-for="(change, index) in entry.changes"
                :key="index"
                class="change-item p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                :class="getChangeTypeClass(change.type)"
              >
                <div class="flex items-start">
                  <div class="mr-3 mt-1 flex-shrink-0">
                    <i :class="getChangeTypeIcon(change.type)"></i>
                  </div>
                  <div class="flex-grow">
                    <div class="mb-1">
                      <Tag
                        :value="getChangeTypeLabel(change.type)"
                        :severity="getChangeTypeSeverity(change.type)"
                        class="change-type text-xs font-bold uppercase tracking-wider"
                      />
                    </div>
                    <p class="text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base">
                      {{ change.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- No results message -->
      <div v-else class="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
          <i class="pi pi-search text-2xl text-gray-400"></i>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">見つかりませんでした</h3>
        <p class="text-gray-500 dark:text-gray-400">選択した条件に一致する更新履歴がありません。</p>
        <Button 
          label="フィルターをクリア" 
          icon="pi pi-refresh" 
          class="p-button-text mt-4" 
          @click="clearFilters"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Select, Button } from 'primevue';
import Tag from 'primevue/tag';
import changelog2025 from '../data/changelog-2025-ja.json';
import changelog2026 from '../data/changelog-2026-ja.json';

// Combine changelog data
const changelogData = {
  entries: [...changelog2026.entries, ...changelog2025.entries]
};

// Reactive state
const selectedVersion = ref(null);
const selectedType = ref(null);
const sortOrder = ref('desc'); // 'desc' (newest first) by default

// Computed properties
const versionOptions = computed(() => {
  // Extract all versions and sort them specifically (semver sort could be better but basic string sort is okay for now)
  const versions = [...new Set(changelogData.entries.map(entry => entry.version))];
  return versions.map(version => ({ label: version, value: version }));
});

const typeOptions = [
  { label: '新機能', value: 'feature' },
  { label: '改善', value: 'improvement' },
  { label: 'バグ修正', value: 'bugfix' },
  { label: 'パフォーマンス', value: 'performance' },
  { label: 'ユーザー要望', value: 'user-request' },
  { label: 'UI', value: 'ui' },
  { label: 'デザイン', value: 'design' },
  { label: 'リファクタリング', value: 'refactor' }
];

const filteredEntries = computed(() => {
  let entries = changelogData.entries;
  
  if (selectedVersion.value) {
    entries = entries.filter(entry => entry.version === selectedVersion.value);
  }
  
  if (selectedType.value) {
    entries = entries.map(entry => ({
      ...entry,
      changes: entry.changes.filter(change => change.type === selectedType.value)
    })).filter(entry => entry.changes.length > 0);
  }

  // Sort by date
  entries = [...entries].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder.value === 'desc' ? dateB - dateA : dateA - dateB;
  });
  
  return entries;
});

const groupedEntries = computed(() => {
  const result = [];
  let currentYear = null;
  let currentGroup = null;

  filteredEntries.value.forEach(entry => {
    const year = new Date(entry.date).getFullYear();
    if (year !== currentYear) {
      currentYear = year;
      currentGroup = { year, entries: [] };
      result.push(currentGroup);
    }
    currentGroup.entries.push(entry);
  });
  
  return result;
});

// Methods
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  });
};

const getChangeTypeSeverity = (type) => {
  switch (type) {
    case 'feature': return 'success';
    case 'bugfix': return 'danger';
    case 'user-request': return 'warn';
    case 'improvement':
    case 'performance':
    case 'ui':
    case 'design':
    case 'refactor': 
      return 'info';
    default: return 'secondary';
  }
};

const getChangeTypeClass = (type) => {
  const classes = {
    feature: 'border-l-4 border-green-500 bg-green-50/50 dark:bg-green-900/10',
    improvement: 'border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
    bugfix: 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-900/10',
    performance: 'border-l-4 border-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/10',
    'user-request': 'border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/10',
    ui: 'border-l-4 border-purple-500 bg-purple-50/50 dark:bg-purple-900/10',
    design: 'border-l-4 border-pink-500 bg-pink-50/50 dark:bg-pink-900/10',
    refactor: 'border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10'
  };
  return classes[type] || 'border-l-4 border-gray-500 bg-gray-50/50 dark:bg-gray-800/50';
};

const getChangeTypeIcon = (type) => {
  const icons = {
    feature: 'pi pi-star-fill text-green-600 dark:text-green-400',
    improvement: 'pi pi-arrow-up text-blue-600 dark:text-blue-400',
    bugfix: 'pi pi-wrench text-red-600 dark:text-red-400',
    performance: 'pi pi-bolt text-cyan-600 dark:text-cyan-400',
    'user-request': 'pi pi-user text-amber-600 dark:text-amber-400',
    ui: 'pi pi-eye text-purple-600 dark:text-purple-400',
    design: 'pi pi-palette text-pink-600 dark:text-pink-400',
    refactor: 'pi pi-code text-indigo-600 dark:text-indigo-400'
  };
  return icons[type] || 'pi pi-circle-fill text-gray-600 dark:text-gray-400';
};

const getChangeTypeLabel = (type) => {
  const labels = {
    feature: '新機能',
    improvement: '改善',
    bugfix: 'バグ修正',
    performance: 'パフォーマンス',
    'user-request': 'ユーザー要望',
    ui: 'UI',
    design: 'デザイン',
    refactor: 'リファクタリング'
  };
  return labels[type] || 'その他';
};

const clearFilters = () => {
  selectedVersion.value = null;
  selectedType.value = null;
};

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
};
</script>

<style scoped>
.changelog-section {
  max-width: 4xl;
}

.change-item {
  transition: all 0.2s ease;
}

.change-item:hover {
  transform: translateX(4px);
}

.change-type {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

/* Custom select styling */
:deep(.p-select) {
  min-width: 12rem;
}

:deep(.p-select-label) {
  padding: 0.5rem 0.75rem;
}
</style>