
<template>
    <div class="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
        <Toast />
  
        <Panel header="財務データインポート" :toggleable="false" class="shadow-md rounded-lg">
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
import { ref } from 'vue';
import { Tabs, TabList, Tab, TabPanels, TabPanel, Panel, Toast } from 'primevue';
import ForecastImportPanel from './components/ForecastImportPanel.vue';
import AccountingImportPanel from './components/AccountingImportPanel.vue';

const activeTab = ref(0);
</script>

<style scoped>
</style>

  