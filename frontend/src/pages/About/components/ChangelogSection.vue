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
          />
        </div>
        
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
      <div
        v-for="entry in filteredEntries"
        :key="entry.version"
        class="changelog-entry mb-6 p-6 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
      >
        <div class="entry-header mb-4">
          <h3 class="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
            <i class="pi pi-tag mr-2 text-blue-600 dark:text-blue-400"></i>
            {{ entry.version }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ formatDate(entry.date) }}
          </p>
        </div>
        
        <div class="changes">
          <div
            v-for="change in entry.changes"
            :key="change.id || change.description"
            class="change-item mb-3 p-3 rounded-md"
            :class="getChangeTypeClass(change.type)"
          >
            <div class="flex items-start">
              <i :class="getChangeTypeIcon(change.type)" class="mr-3 mt-1"></i>
              <div>
                <span class="change-type font-medium text-sm uppercase tracking-wide">
                  {{ getChangeTypeLabel(change.type) }}
                </span>
                <p class="mt-1 text-gray-700 dark:text-gray-300">
                  {{ change.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- No results message -->
      <div v-if="filteredEntries.length === 0" class="text-center py-8">
        <i class="pi pi-info-circle text-4xl text-gray-400 mb-4"></i>
        <p class="text-gray-600 dark:text-gray-300">選択した条件に一致する更新履歴がありません。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Select, Button } from 'primevue';

// Reactive state
const selectedVersion = ref(null);
const selectedType = ref(null);
const changelogData = ref({ entries: [] });

// Load changelog data
onMounted(async () => {
  try {
    // Load changelog data from external JSON file
    const response = await fetch('/data/changelog-ja.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    changelogData.value = data;
  } catch (error) {
    console.error('Failed to load changelog data:', error);
    // Fallback to static data if loading fails
    changelogData.value = {
      entries: [
        {
          version: 'v1.0.0',
          date: '2025-06-01',
          changes: [
            {
              type: 'feature',
              description: 'ホテル管理システムの初回リリース - 包括的な予約管理、顧客管理、請求機能を提供'
            }
          ]
        }
      ]
    };
  }
});

// Computed properties
const versionOptions = computed(() => {
  const versions = [...new Set(changelogData.value.entries.map(entry => entry.version))];
  return versions.map(version => ({ label: version, value: version }));
});

const typeOptions = [
  { label: '新機能', value: 'feature' },
  { label: '改善', value: 'improvement' },
  { label: 'バグ修正', value: 'bugfix' }
];

const filteredEntries = computed(() => {
  let entries = changelogData.value.entries;
  
  if (selectedVersion.value) {
    entries = entries.filter(entry => entry.version === selectedVersion.value);
  }
  
  if (selectedType.value) {
    entries = entries.map(entry => ({
      ...entry,
      changes: entry.changes.filter(change => change.type === selectedType.value)
    })).filter(entry => entry.changes.length > 0);
  }
  
  return entries;
});

// Methods
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getChangeTypeClass = (type) => {
  const classes = {
    feature: 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500',
    improvement: 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500',
    bugfix: 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500'
  };
  return classes[type] || 'bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-500';
};

const getChangeTypeIcon = (type) => {
  const icons = {
    feature: 'pi pi-plus-circle text-green-600 dark:text-green-400',
    improvement: 'pi pi-arrow-up text-blue-600 dark:text-blue-400',
    bugfix: 'pi pi-wrench text-red-600 dark:text-red-400'
  };
  return icons[type] || 'pi pi-info-circle text-gray-600 dark:text-gray-400';
};

const getChangeTypeLabel = (type) => {
  const labels = {
    feature: '新機能',
    improvement: '改善',
    bugfix: 'バグ修正'
  };
  return labels[type] || 'その他';
};

const clearFilters = () => {
  selectedVersion.value = null;
  selectedType.value = null;
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