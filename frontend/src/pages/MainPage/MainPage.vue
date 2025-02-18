<template>
    <div class="min-h-screen">
        <div class="grid grid-cols-12 bg-gray-100">
            <!-- Top Menu -->
            <div class="col-span-12 hidden mb-1 md:block">
                <TopMenu />
            </div>
        
            <!-- Left Sidebar -->
            <div :class="sidebarClass">
                <SideMenu :isCollapsed="isCollapsed" @toggle="toggleSidebar" />
            </div>

            <!-- Main Content --> 
            <div :class="mainContentClass">
                <router-view />
            </div>
            
        </div>
    </div>
</template>
  
<script>
    import { computed, ref, } from "vue";
    import { useRoute, useRouter } from "vue-router";

    import TopMenu from './components/TopMenu.vue';
    import SideMenu from './components/SideMenu.vue';
    import RoomIndicator from './RoomIndicator.vue';

    import { Splitter, SplitterPanel } from 'primevue';    
  
    export default {
        components: {
            TopMenu,
            SideMenu,
            RoomIndicator,
            Splitter,
            SplitterPanel,
        },
        setup() {
            const route = useRoute();
            const router = useRouter();
            const isCollapsed = ref(false);            
        
            const toggleSidebar = () => {
                isCollapsed.value = !isCollapsed.value;
            };

            // Classes for dynamic styling
            const sidebarClass = computed(() => ({
                "bg-emerald-500 text-white": true,
                "col-span-12 md:col-span-3 lg:col-span-2 md:min-h-screen": !isCollapsed.value,
                "col-span-1 min-h-screen": isCollapsed.value,
            }));

            const mainContentClass = computed(() => ({
                "col-span-12 md:col-span-9 lg:col-span-10 min-h-screen": !isCollapsed.value,
                "col-span-11 min-h-screen": isCollapsed.value,
            }));
            
            return {
                isCollapsed,                
                toggleSidebar,                
                sidebarClass,
                mainContentClass,                
            }
        },        
    };
</script>
  
<style scoped>
</style>
  