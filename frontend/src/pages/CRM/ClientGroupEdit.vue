<template>
    <div class="p-6">
      <Tabs value="0">
        <TabList>
          <Tab value="0" as="div" class="flex items-center gap-2">
            <span class="font-bold whitespace-nowrap">基本情報</span>
          </Tab>          
          <Tab value="1" as="div" class="flex items-center gap-2">
            <span class="font-bold whitespace-nowrap">予約歴</span>
          </Tab>
          
        </TabList>
        <TabPanels>
          <TabPanel value="0" as="p" class="m-0">
            <div v-if="loadingBasicInfo">Loading...</div>
            <ClientGroupBasicInfo v-else/>
          </TabPanel>          
          <TabPanel value="1" as="p" class="m-0">
            <ClientGroupReservationHistory />
          </TabPanel>          
        </TabPanels>
      </Tabs>        
    </div>
</template>
<script setup>
    // Vue
    import { ref, watch } from "vue";
    import { useRoute } from 'vue-router';
    const route = useRoute();


    import ClientGroupBasicInfo from './components/ClientGroupBasicInfo.vue';
    import ClientGroupReservationHistory from './components/ClientGroupReservationHistory.vue';

    // Primevue    
    import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primevue';

    // Stores
    import { useClientStore } from '@/composables/useClientStore';
    const { fetchGroup} = useClientStore();

    const groupId = ref(route.params.groupId);
    const loadingBasicInfo = ref(false);

    // Watch for changes in the route's groupId parameter
    watch(
        () => route.params.groupId,
        async (newGroupId) => {
            if (newGroupId) {
                groupId.value = newGroupId;
                loadingBasicInfo.value = true;
                try {
                    await fetchGroup(groupId.value);
                    loadingBasicInfo.value = false;
                } catch (error) {
                    console.error("Error fetching group data:", error);
                    loadingBasicInfo.value = false;
                }
            }
        }
    );
</script>