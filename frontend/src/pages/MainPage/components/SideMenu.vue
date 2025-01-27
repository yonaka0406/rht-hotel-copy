<template>
        <!-- Menu -->
        <div class="flex bg-gray-100 m-0 p-0 w-full">        
            <div class="w-full bg-emerald-500 text-white m-0 flex flex-col h-full hidden md:block overflow-auto no-scroll">
                <div class="grid grid-cols-2 items-center">
                    <!-- Button to collapse/expand sidebar -->
                    <div>                                    
                        <button
                            @click="toggleSidebar"
                            class="p-2 bg-gray-800 text-white rounded-full m-2 p-2"
                            aria-label="Toggle Sidebar"
                        >
                            <i class="pi" :class="isCollapsed ? 'pi-arrow-right' : 'pi-arrow-left'"></i>
                        </button>
                    </div>
                    <!-- Title -->
                    <div v-if="!isCollapsed" class="justify-items-start">
                        <router-link to="/" class="text-white p-2 block rounded">
                            <h2 class="text-xl font-semibold">PMS</h2>
                        </router-link>                    
                    </div>
                </div>
                <!-- Menu -->
                <Menu v-if="!isCollapsed" :model="items" class="flex-1 overflow-auto">
                    <template #item="{ item }">
                        <router-link
                            v-if="item.route"
                            v-slot="{ href, navigate }"
                            :to="item.route"
                            custom
                        >
                            <a
                                v-ripple
                                class="flex items-center cursor-pointer text-surface-700 dark:text-surface-0 px-4 py-2"
                                :href="href"
                                @click="navigate"
                            >
                                <span :class="item.icon" />
                                <span class="ml-2">{{ item.label }}</span>
                            </a>
                        </router-link>
                        <a
                            v-else
                            v-ripple
                            class="flex items-center cursor-pointer text-surface-700 dark:text-surface-0 px-4 py-2"
                            :href="item.url"
                            :target="item.target"
                        >
                            <span :class="item.icon" />
                            <span class="ml-2">{{ item.label }}</span>
                            <span v-if="item.items" class="pi pi-angle-down text-primary ml-auto" />
                        </a>
                    </template>
                </Menu>

                <!-- Admin and Logout -->
                <div v-if="!isCollapsed" class="mt-auto">   
                    <router-link
                        to="/admin"
                        class="text-white hover:bg-yellow-100 p-2 block rounded mt-4"
                    >
                        <i class="pi pi-cog mr-2"></i>管理者パネル
                    </router-link>                 
                    <button
                        @click="handleLogout"
                        class="w-full text-white bg-transparent hover:bg-red-500 hover:border-red-500 p-2 block rounded mt-4"
                    >
                        <i class="pi pi-sign-out mr-2"></i>ログアウト
                    </button>
                </div>
            </div>
        </div>
        <!-- Menubar -->
        <div class="flex bg-gray-100 m-0 p-0 block w-full md:hidden">
            <Menubar :model="items" class="w-full mb-2">
                <template #start>
                         <!-- Logo -->
                        <img src="@/assets/vue.svg" alt="Hotel PMS" class="h-8" />                                   
                </template>
                <template #end>                    
                    <div class="flex items-center gap-2">
                        <!-- Notifications Icon -->                        
                        <OverlayBadge :value="holdReservations.length" class="mr-2">
                            <button class="p-button p-button-text" aria-label="通知" @click="showDrawer = true">
                                <i class="pi pi-bell" style="font-size:larger" />
                            </button>
                        </OverlayBadge>
                        <!-- Hotel Dropdown -->
                        <Select
                            name="hotel"
                            v-model="selectedHotelId"
                            :options="hotels"
                            optionLabel="name" 
                            optionValue="id"
                            :virtualScrollerOptions="{ itemSize: 38 }"
                            class="w-48"
                            placeholder="ホテル選択"
                            filter
                        />
                        <!-- Home Router Link with Icon in the Menubar -->
                        <router-link
                            to="/"
                            class="text-primary hover:bg-yellow-100 p-2 block rounded flex items-end"
                        >
                            <i class="pi pi-home"></i>                        
                        </router-link>
                        <button
                            @click="handleLogout"
                            class="text-red-500 bg-transparent hover:bg-red-500 hover:border-red-500 p-2 block rounded items-end"
                        >
                            <i class="pi pi-sign-out"></i>                        
                        </button>
                    </div>
                </template>
            </Menubar>

            <!-- Drawer for Notifications -->
            <Drawer v-model:visible="showDrawer" position="right" :style="{ width: '300px' }" header="通知">
                <ul v-if="holdReservations.length">
                    <li v-for="(reservation, index) in holdReservations" :key="index" class="m-2">
                        <button @click="goToNewReservationPage(reservation.reservation_id)">
                            <p>保留中予約には注意が必要です：</p>
                            {{ reservation.client_name }} @ {{ reservation.check_in }}
                        </button>
                        <Divider />
                    </li>
                </ul>
                <p v-else class="text-center text-gray-500">通知はありません。</p>
            </Drawer>
        </div>    
</template>
  
<script>
    import { ref, onMounted, watch } from 'vue';    
    import { useHotelStore } from '@/composables/useHotelStore';
    import { useReservationStore } from '@/composables/useReservationStore';
    import { useRouter } from 'vue-router';    
    import { Menu, Menubar, OverlayBadge, Select, Drawer, Divider } from 'primevue';
    import Button from 'primevue/button';

    export default {
        components: {
            Menu,  
            Menubar, 
            OverlayBadge,
            Select,
            Drawer,
            Divider,
            Button,
        },
        props: {
            isCollapsed: {
               type: Boolean,
                required: true
            },
        },
        setup() {
            const router = useRouter();
            const { hotels, selectedHotelId, setHotelId, fetchHotels } = useHotelStore();
            const { holdReservations, fetchMyHoldReservations, getReservationHotelId, setReservationId } = useReservationStore();
            const expandedKeys = ref({});
            const items = ref([
                    {
                        key: 'dashboard',
                        label: 'ダッシュボード',
                        icon: 'pi pi-fw pi-chart-bar',
                        route: '/dashboard',
                    },
                    {
                        key: 'reservations',
                        label: '予約',
                        icon: 'pi pi-fw pi-calendar',
                        items: [
                            { 
                                key: 'reservationsNew',
                                label: '新規予約', 
                                icon: 'pi pi-fw pi-plus',                                 
                                command: () => {
                                    //router.push('/reservations/new');
                                    goToNewReservation();
                                },
                            },
                            { 
                                key: 'reservationsView',
                                label: '予約参照', 
                                icon: 'pi pi-fw pi-eye', 
                                command: () => {
                                    router.push('/reservations/calendar');
                                },                                
                            },
                        ],
                    },
                    {
                        key: 'reports',
                        label: 'レポート',
                        icon: 'pi pi-fw pi-file',
                        items: [
                            { 
                                label: '日次レポート', 
                                icon: 'pi pi-fw pi-calendar',
                                command: () => {
                                    router.push('/reports/daily');
                                },                                 
                            },
                            { 
                                label: '月次レポート', 
                                icon: 'pi pi-fw pi-calendar-plus', 
                                command: () => {
                                    router.push('/reports/monthly');
                                },
                            },
                        ],
                    },
            ]);
            const showDrawer = ref(false);

            // Handle notification click (navigate to New Reservation page)
            const goToNewReservationPage = async (reservation_id) => {                
                setReservationId(reservation_id);
                
                const hotel_id = await getReservationHotelId(reservation_id);
                setHotelId(hotel_id);

                router.push({ name: 'ReservationsNew' });                
                showDrawer.value = false; // Close the notifications drawer
            };
            const goToNewReservation = () => {                
                setReservationId(null);                
                router.push({ name: 'ReservationsNew' });
            };
            
            onMounted(() => {
                fetchHotels();
            });
            onMounted( async () => {
                await fetchMyHoldReservations();                
            });
/*
            watch(hotels, (newVal, oldVal) => {
                console.log('hotels changed from', oldVal, 'to', newVal);
            });
*/
            watch(
                selectedHotelId,
                (newVal, oldVal) => {                    
                    if (newVal) {
                        //console.log(`Hotel ID ${newVal} is being provided by SideMenu.`);
                    }
                },
                { immediate: true } 
            );

            return{
                expandedKeys,
                items,
                hotels,
                selectedHotelId,
                holdReservations,                
                showDrawer,                
                goToNewReservationPage,
                goToNewReservation,
            };
        },
        emits: ['toggle'],
        methods: {
            toggleSidebar() {
                this.$emit('toggle');
            },
            handleLogout() {
                // Clear user session or token
                localStorage.removeItem('authToken'); // Example token removal
                this.$router.push('/login'); // Redirect to login page
            },
        },
    };
</script>

<style scoped>
    .no-scroll {
        overflow: hidden; /* Prevent scrolling entirely */
    }

    .no-scroll::-webkit-scrollbar {
        display: none; /* Hide scrollbars in WebKit browsers */
    }

    .no-scroll {
        -ms-overflow-style: none; /* Hide scrollbars in IE/Edge */
        scrollbar-width: none;    /* Hide scrollbars in Firefox */
    }

    button {
        background-color: transparent;
    }
</style>
