<template>
  <div v-if="loadingBasicInfo" class="p-6">
    クライアント情報を読み込み中...
  </div>
  <div v-else class="p-6 bg-gray-100 dark:bg-gray-900">
    <Tabs value="0">
      <TabList>
        <Tab value="0" as="div" class="flex items-center gap-2">
          <span class="font-bold whitespace-nowrap">基本情報</span>
          <i v-if="hasBlockImpediment" class="pi pi-ban text-red-500 ml-2"></i>
        </Tab>
        <Tab value="1" as="div" class="flex items-center gap-2">
          <span class="font-bold whitespace-nowrap">住所</span>
          <Badge>
            {{ addressCount }}
          </Badge>
        </Tab>
        <Tab value="2" as="div" class="flex items-center gap-2">
          <span class="font-bold whitespace-nowrap">予約歴・営業歴</span>
        </Tab>
        <Tab v-if="selectedClient?.client?.legal_or_natural_person === 'legal'" value="3" as="div"
          class="flex items-center gap-2">
          <span class="font-bold whitespace-nowrap">関連企業</span>
        </Tab>
        <Tab value="4" as="div" class="flex items-center gap-2">
          <span class="font-bold whitespace-nowrap">関連プロジェクト</span>
        </Tab>
        <Tab value="5" as="div" class="flex items-center gap-2">
          <span class="font-bold whitespace-nowrap">障害</span>
          <Badge>
            {{ impedimentCount }}
          </Badge>
        </Tab>
        <Tab value="6" as="div" class="flex items-center gap-2">
          <span class="font-bold whitespace-nowrap">変更履歴</span>
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="0" as="p" class="m-0 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
          <ClientBasicInfo v-if="!loadingBasicInfo" />
        </TabPanel>
        <TabPanel value="1" as="p" class="m-0 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
          <ClientAddresses :addresses="null" />
        </TabPanel>
        <TabPanel value="2" as="p" class="m-0 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
          <ClientReservationHistory />
        </TabPanel>
        <TabPanel v-if="selectedClient?.client?.legal_or_natural_person === 'legal'" value="3" as="p"
          class="m-0 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
          <ClientRelated :client-id="clientId" />
        </TabPanel>
        <TabPanel value="4" as="p" class="m-0 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
          <div class="mt-2">
            <RelatedProjectsList :current-client-id="clientId" />
          </div>
        </TabPanel>
        <TabPanel value="5" as="p" class="m-0 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
          <ClientImpedimentsTab />
        </TabPanel>
        <TabPanel value="6" as="p" class="m-0 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
          <ClientEditHistory />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup>
// Vue
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();

import ClientBasicInfo from './components/ClientBasicInfo.vue';
import ClientAddresses from './components/ClientAddresses.vue';
import ClientReservationHistory from './components/ClientReservationHistory.vue';
import ClientEditHistory from './components/ClientEditHistory.vue';
import ClientRelated from './components/ClientRelated.vue';
import RelatedProjectsList from './components/RelatedProjectsList.vue';
import ClientImpedimentsTab from './components/ClientImpedimentsTab.vue';

// Stores
import { useClientStore } from '@/composables/useClientStore';
const { selectedClient, selectedClientAddress, fetchClient } = useClientStore();

import { useCRMStore } from '@/composables/useCRMStore';
const { clientImpediments, fetchImpedimentsByClientId } = useCRMStore();

// Primevue
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primevue';
import { Badge } from 'primevue';

const clientId = ref(route.params.clientId);
const loadingBasicInfo = ref(false);

const addressCount = computed(() => {
  if (!selectedClientAddress.value) {
    return 0;
  }

  return Object.keys(selectedClientAddress.value).length;
});

const impedimentCount = computed(() => {
  return clientImpediments.value.length;
});

const hasBlockImpediment = computed(() => {
  return clientImpediments.value.some(imp => imp.is_active && imp.restriction_level === 'block');
});

// Watch for changes in the route's clientId parameter
watch(
  () => route.params.clientId,
  async (newClientId) => {
    if (newClientId) {
      clientId.value = newClientId;
      loadingBasicInfo.value = true;
      try {
        await fetchClient(clientId.value);
        await fetchImpedimentsByClientId(clientId.value);
        loadingBasicInfo.value = false;
      } catch (error) {
        console.error("Error fetching client data:", error);
        loadingBasicInfo.value = false;
      }
    }
  },
  { immediate: true }
);
</script>