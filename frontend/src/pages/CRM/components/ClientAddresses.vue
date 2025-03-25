<template>

</template>
<script setup>
    // Vue
    import { ref, onMounted, watch } from 'vue';
    import { useRoute } from 'vue-router';
    const route = useRoute();

    // Stores
    import { useClientStore } from '@/composables/useClientStore';
    const { selectedClient, fetchClient, updateClientInfoCRM } = useClientStore(); 

    const clientId = ref(route.params.clientId);
    const loading = ref(false);

    onMounted(async () => {        
        try {            
            loading.value = true;
            console.log('Addresses:', clientId.value);
            
            loading.value = false;            
        } catch (error) {
            console.error("Error fetching client data:", error);      
        }
    });
</script>