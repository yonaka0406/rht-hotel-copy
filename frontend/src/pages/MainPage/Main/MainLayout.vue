<template>
    <div class="min-h-screen dark:bg-gray-900">
        <div class="grid grid-cols-12 bg-gray-100 dark:bg-gray-900">
            <div :class="sidebarClass">
                <SideMenu :isCollapsed="isCollapsed" @toggle="toggleSidebar" />
            </div>

            <div :class="mainContentClass" class="flex flex-col bg-gray-100 dark:bg-gray-900">
                <div class="w-full hidden md:block mb-1 px-4 py-1">
                    <TopMenu />
                </div>

                <div class="w-full block md:hidden">
                  <SideMenu :isCollapsed="isCollapsed" @toggle="toggleSidebar" />
                </div>
                
                <div class="flex-grow p-4 bg-gray-100 dark:bg-gray-900">
                    <router-view />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    // Vue
    import { computed, ref } from "vue";

    // Components
    import TopMenu from './components/TopMenu.vue';
    import SideMenu from './components/SideMenu.vue';
            
    const isCollapsed = ref(false);           
     
    const toggleSidebar = () => {
        isCollapsed.value = !isCollapsed.value;
    };

    // Classes for dynamic styling           
    const sidebarClass = computed(() => ({        
        "hidden md:block": true,
        "md:col-span-3 lg:col-span-2 md:min-h-screen": !isCollapsed.value,
        "md:col-span-1 md:min-h-screen": isCollapsed.value,
    }));

    const mainContentClass = computed(() => ({
        "col-span-12 md:col-span-9 lg:col-span-10 min-h-screen": !isCollapsed.value,
        "col-span-12 md:col-span-11 min-h-screen": isCollapsed.value,
    }));                   
    
</script>
 
<style scoped>
</style>