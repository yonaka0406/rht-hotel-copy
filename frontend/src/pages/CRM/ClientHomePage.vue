<template>
    <div class="min-h-screen">
        <div class="grid grid-cols-12 bg-gray-100">
            <!-- Top Menu -->
            <div class="col-span-12 mx-1 mt-1">
                <ClientTopMenu />
            </div>
            <!-- Main Content -->
            <div class="col-span-12 min-h-screen">
                <Panel class="min-h-screen m-1 p-2">
                    <router-view />
                </Panel>
                
            </div>
        </div>
    </div>
</template>
  
<script>
    import { onMounted } from "vue";
    import { useRoute, useRouter } from "vue-router";
    import ClientTopMenu from './components/ClientTopMenu.vue';    
    
    import { Menu, Panel } from 'primevue';    
  
    export default {
        components: { 
            ClientTopMenu,            
            Menu,
            Panel,            
        },
        setup() {
            const route = useRoute();
            const router = useRouter();

            onMounted(() => {
                router.push('/crm/dashboard');
            });
            
            return {
                
            }
        },        
    };
</script>
<style scoped>
</style>