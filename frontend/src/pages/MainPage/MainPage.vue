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
    import TopMenu from './components/TopMenu.vue';
    import SideMenu from './components/SideMenu.vue';    

    import Splitter from 'primevue/splitter';
    import SplitterPanel from 'primevue/splitterpanel';
  
    export default {
        components: {
            TopMenu,
            SideMenu,            
            Splitter,
            SplitterPanel,
        },
        data() {
            return {
                // Sidebar is expanded by default
                isCollapsed: false
            };
        },
        computed: {
            sidebarClass() {
                return {
                    'bg-emerald-500 text-white': true,
                    'col-span-12 md:col-span-3 lg:col-span-2 md:min-h-screen': !this.isCollapsed,  // Full width when expanded
                    'col-span-1 min-h-screen': this.isCollapsed // Narrow when collapsed
                };
            },
            mainContentClass() {
                return {
                    'col-span-12 md:col-span-9 lg:col-span-10 min-h-screen': !this.isCollapsed, // Takes more space when sidebar is expanded
                    'col-span-11 min-h-screen': this.isCollapsed, // Takes nearly full width when sidebar is collapsed
                };
            },
        },
        setup() {
            
        },
        methods: {
            toggleSidebar() {
                this.isCollapsed = !this.isCollapsed;
            }
        },
    };
</script>
  
<style scoped>
</style>
  