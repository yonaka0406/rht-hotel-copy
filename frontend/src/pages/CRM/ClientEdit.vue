<template>
    <div class="p-6">
      <Tabs value="0">
        <TabList>
          <Tab value="0" as="div" class="flex items-center gap-2">
            <span class="font-bold whitespace-nowrap">基本情報</span>
          </Tab>
          <Tab value="1" as="div" class="flex items-center gap-2">
            <span class="font-bold whitespace-nowrap">住所</span>
            <Badge>
              {{ addressCount }}
            </Badge>
          </Tab>
          <Tab value="2" as="div" class="flex items-center gap-2">
            <span class="font-bold whitespace-nowrap">予約歴</span>
          </Tab>
          <Tab v-if="selectedClient?.client.legal_or_natural_person === 'legal'" value="3" as="div" class="flex items-center gap-2">
            <span class="font-bold whitespace-nowrap">関連企業</span>
          </Tab>
          <Tab value="5" as="div" class="flex items-center gap-2">
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
            <ClientReservationHistory />
          </TabPanel>
          <TabPanel v-if="selectedClient?.client.legal_or_natural_person === 'legal'" value="3" as="p" class="m-0">
            <ClientRelated :client-id="clientId" />
          </TabPanel>
          <TabPanel value="5" as="p" class="m-0">
            <ClientEditHistory />
          </TabPanel>
        </TabPanels>
      </Tabs>        
    </div>
  </template>
  
  <script setup>
    // Vue
    import { ref, computed, watch, onMounted } from 'vue';
    import { useRoute } from 'vue-router';
    const route = useRoute();
    
    import ClientBasicInfo from './components/ClientBasicInfo.vue';
    import ClientAddresses from './components/ClientAddresses.vue';
    import ClientReservationHistory from './components/ClientReservationHistory.vue';
    import ClientEditHistory from './components/ClientEditHistory.vue';    
    import ClientRelated from './components/ClientRelated.vue'; 

    // Stores
    import { useClientStore } from '@/composables/useClientStore';
    const { selectedClient, selectedClientAddress, fetchClient } = useClientStore();

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

    // Watch for changes in the route's clientId parameter
    watch(
        () => route.params.clientId,
        async (newClientId) => {
            if (newClientId) {
                clientId.value = newClientId;
                loadingBasicInfo.value = true;
                try {
                    await fetchClient(clientId.value);
                    loadingBasicInfo.value = false;
                } catch (error) {
                    console.error("Error fetching client data:", error);
                    loadingBasicInfo.value = false;
                }
            }
        }
    );
  </script>