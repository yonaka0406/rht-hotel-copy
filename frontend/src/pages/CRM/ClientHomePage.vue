<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div class="grid grid-cols-12 bg-gray-100 dark:bg-gray-900">
            <!-- Top Menu -->
            <div class="col-span-12 mx-1 mt-1">
                <ClientTopMenu />
            </div>
            <!-- Main Content -->
            <div class="col-span-12 min-h-screen">
                <Panel class="min-h-screen m-1 p-2 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                    <router-view />
                </Panel>
                
            </div>
        </div>
    </div>
</template>
  
<script setup>
    import { onMounted } from "vue";
    import { useRoute, useRouter } from "vue-router";
    import ClientTopMenu from './components/ClientTopMenu.vue';    
    
    import { Menu, Panel } from 'primevue';

    const route = useRoute();
    const router = useRouter();

    onMounted(() => {
        if (route.path === '/crm') {
            router.push('/crm/dashboard');
        }
    });    
</script>
<style scoped>
</style>