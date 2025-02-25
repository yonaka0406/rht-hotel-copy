<template>
    <div class="p-6">
      <Tabs value="0">
        <TabList>
          <Tab value="0" as="div" class="flex items-center gap-2">
            <span class="font-bold whitespace-nowrap">基本情報</span>
          </Tab>
          <Tab value="1" as="div" class="flex items-center gap-2">
            <span class="font-bold whitespace-nowrap">住所</span>
            <Badge value="2" />
          </Tab>
          <Tab value="2" as="div" class="flex items-center gap-2">
            <span class="font-bold whitespace-nowrap">変更履歴</span>
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="0" as="p" class="m-0">
            <div v-if="loadingBasicInfo">Loading from ClientEdit...</div>
            <ClientBasicInfo v-else/>
          </TabPanel>
          <TabPanel value="1" as="p" class="m-0">
            <ClientAddresses :addresses="null" />
          </TabPanel>
          <TabPanel value="2" as="p" class="m-0">
            <ClientEditHistory :history="null" />
          </TabPanel>
        </TabPanels>
      </Tabs>        
    </div>
  </template>
  
  <script setup>
    import { ref, onMounted } from 'vue';
    import { useRoute } from 'vue-router';
    import ClientBasicInfo from './components/ClientBasicInfo.vue';
    import ClientAddresses from './components/ClientAddresses.vue';
    import ClientEditHistory from './components/ClientEditHistory.vue';
    import { useClientStore } from '@/composables/useClientStore';
    import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primevue';
    import { Badge } from 'primevue';
  
    const route = useRoute();
    const { selectedClient, fetchClient } = useClientStore();
    const clientId = ref(route.params.clientId);
    const loadingBasicInfo = ref(false);
  /*
    onMounted(async () => {        
        try {
          console.log("Client id:", clientId.value);
          loadingBasicInfo.value = true;
          await fetchClient(clientId.value);
          loadingBasicInfo.value = false;
          console.log("Selected client:", selectedClient.value);
        } catch (error) {
          console.error("Error fetching client data:", error);      
        }
    });
  */
  </script>