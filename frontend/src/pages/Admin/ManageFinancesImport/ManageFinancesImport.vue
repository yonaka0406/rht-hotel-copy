
<template>
    <div class="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
        <Toast />
  
        <Panel header="財務データインポート" :toggleable="false" class="shadow-md rounded-lg">
            <!-- Categories Dictionary Panel -->
            <Panel header="カテゴリー辞書" :toggleable="true" :collapsed="true" class="mb-4">
                <div v-if="categoriesLoading" class="text-center p-4">
                    <ProgressSpinner size="small" />
                    <p class="mt-2">カテゴリーを読み込み中...</p>
                </div>
                <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Type Categories -->
                    <div>
                        <h4 class="font-semibold mb-2 text-blue-600">タイプカテゴリー</h4>
                        <div class="space-y-1">
                            <div v-for="category in categories.typeCategories" :key="category.id" 
                                 class="flex items-center text-sm p-2 bg-blue-50 rounded">
                                <span class="font-mono text-xs bg-blue-200 px-1 rounded mr-2">{{ category.id }}</span>
                                <span class="font-medium">{{ category.name }}</span>
                                <span v-if="category.description" class="text-gray-600 ml-2">- {{ category.description }}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Package Categories -->
                    <div>
                        <h4 class="font-semibold mb-2 text-green-600">パッケージカテゴリー</h4>
                        <div class="space-y-1">
                            <div v-for="category in categories.packageCategories" :key="category.id" 
                                 class="flex items-center text-sm p-2 bg-green-50 rounded">
                                <span class="font-mono text-xs bg-green-200 px-1 rounded mr-2">{{ category.id }}</span>
                                <span class="font-medium">{{ category.name }}</span>
                                <span v-if="category.description" class="text-gray-600 ml-2">- {{ category.description }}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sales Categories -->
                    <div>
                        <h4 class="font-semibold mb-2 text-purple-600">売上区分</h4>
                        <div class="space-y-1">
                            <div v-for="category in categories.salesCategories" :key="category.id" 
                                 class="flex items-center text-sm p-2 bg-purple-50 rounded">
                                <span class="font-mono text-xs bg-purple-200 px-1 rounded mr-2">{{ category.id }}</span>
                                <span class="font-medium">{{ category.name }}</span>
                                <span v-if="category.description" class="text-gray-600 ml-2">- {{ category.description }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>

            <Tabs v-model:value="activeTab" class="pt-2">
                <TabList>
                    <Tab :value="0">予算データインポート</Tab>
                    <Tab :value="1">実績データインポート</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel :value="0">
                        <ForecastImportPanel />
                    </TabPanel>
                    <TabPanel :value="1">
                        <AccountingImportPanel />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Panel>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Tabs, TabList, Tab, TabPanels, TabPanel, Panel, Toast, ProgressSpinner } from 'primevue';
import ForecastImportPanel from './components/ForecastImportPanel.vue';
import AccountingImportPanel from './components/AccountingImportPanel.vue';
import { useImportLogic } from './composables/useImportLogic';

const activeTab = ref(0);
const categories = ref({
    typeCategories: [],
    packageCategories: [],
    salesCategories: []
});
const categoriesLoading = ref(true);

const { getCategoriesDictionary } = useImportLogic();

onMounted(async () => {
    try {
        categories.value = await getCategoriesDictionary();
    } catch (error) {
        console.error('Error loading categories dictionary:', error);
    } finally {
        categoriesLoading.value = false;
    }
});
</script>

<style scoped>
</style>

  