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

                <div v-if="!hasActiveRoute">
                    <RoomIndicator />
                </div>
                
            </div>
            
        </div>
    </div>
</template>
  
<script>
    import { computed } from "vue";
    import { useRoute } from "vue-router";

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
            const route = useRoute();

            const hasActiveRoute = computed(() => {
                return route.matched.length > 1; // If there are matched routes, it's active
            });

            return {
                hasActiveRoute,
            }
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
  