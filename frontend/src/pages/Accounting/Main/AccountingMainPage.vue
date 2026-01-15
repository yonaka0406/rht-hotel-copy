<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900 overflow-x-hidden">
        <div class="grid grid-cols-12 bg-gray-100 dark:bg-gray-900">
            <!-- Main Content -->
            <div class="col-span-12">
                <Panel class="m-1 p-2 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 min-h-[calc(100vh-0.5rem)]">
                    <AccountingTopBar />
                    <router-view />
                </Panel>
            </div>
        </div>
    </div>
</template>
  
<script setup>
    import { onMounted } from "vue";
    import { useRoute, useRouter } from "vue-router";
    import { Panel } from 'primevue';
    import AccountingTopBar from './components/AccountingTopBar.vue';

    const route = useRoute();
    const router = useRouter();

    onMounted(() => {
        // Redirect to dashboard if accessing the base accounting route
        if (route.path === '/accounting') {
            router.push('/accounting/dashboard');
        }
    });    
</script>

<style scoped>
</style>
