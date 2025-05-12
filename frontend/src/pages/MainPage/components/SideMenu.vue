<template>
        <!-- Menu -->
        <div class="flex bg-gray-100 m-0 p-0 w-full">        
            <div class="w-full bg-emerald-500 text-white m-0 flex flex-col h-full hidden md:block overflow-auto no-scroll">
                <div class="grid grid-cols-2 items-center">
                    <!-- Button to collapse/expand sidebar -->
                    <div>                                    
                        <button
                            @click="toggleSidebar"
                            class="p-2 text-white rounded-full m-2 p-2"
                            style="background-color: transparent;"
                            aria-label="Toggle Sidebar"
                        >
                            <i class="pi" :class="isCollapsed ? 'pi-arrow-right' : 'pi-arrow-left'"></i>
                        </button>
                    </div>
                    <!-- Title -->
                    <div v-if="!isCollapsed" class="justify-items-start">
                        <router-link to="/" class="text-white p-2 block rounded-sm">
                            <span class="text-xl font-semibold text-white">PMS</span>
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

                    <router-link v-if="isAdmin"
                        to="/admin"
                        class="bg-yellow-500 hover:bg-yellow-600 p-2 block rounded my-4 mx-2"
                    >
                        <i class="pi pi-cog text-white mr-2"></i>
                        <span class="text-white">管理者パネル</span>
                    </router-link>                 
                    <router-link v-if="isClientEditor"
                        to="/crm/dashboard"
                        class="bg-blue-500 hover:bg-blue-600 p-2 block rounded my-4 mx-2"
                    >
                        <i class="pi pi-users text-white mr-2"></i>
                        <span class="text-white">顧客情報</span>
                    </router-link>
                    <div class="my-4 mx-2">
                        <Button
                            @click="handleLogout"
                            severity="danger"                        
                            fluid
                        >
                            <i class="pi pi-sign-out"></i>ログアウト
                        </Button>
                    </div>
                    
                </div>
            </div>
        </div>
        <!-- Menubar -->
        <div class="flex bg-gray-100 m-0 p-0 block w-full md:hidden">
            <Menubar :model="items" class="w-full mb-2">
                <template #start>
                         <!-- Logo -->
                        <img src="@/assets/logo-favi.png" alt="WeHub" class="h-8" />                                   
                </template>
                <template #end>                    
                    <div class="flex items-center gap-4">     
                        <span>{{ userGreeting }}</span>                   
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
                        <Button
                            @click="handleLogout"
                            severity="danger"
                        >
                            <i class="pi pi-sign-out"></i>                        
                        </Button>
                    </div>
                </template>
            </Menubar>

            <!-- Drawer for Notifications -->
            <Drawer v-model:visible="showDrawer" position="right" :style="{ width: '300px' }" header="通知">
                <ul v-if="holdReservations.length">
                    <li v-for="(reservation, index) in holdReservations" :key="index" class="m-2">
                        <button @click="goToEditReservationPage(reservation.hotel_id, reservation.reservation_id)">
                            <p>保留中予約を完成させてください:</p>
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
    import { ref, computed, watch, onMounted } from 'vue';    
    import { useUserStore } from '@/composables/useUserStore';
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
            const { logged_user, fetchUser } = useUserStore();
            const { hotels, selectedHotelId, setHotelId, fetchHotels } = useHotelStore();
            const { holdReservations, fetchMyHoldReservations, getReservationHotelId, setReservationId } = useReservationStore();
            const expandedKeys = ref({});
            const items = ref([
                    {
                        key: 'indicator',
                        label: 'ホーム',
                        icon: 'pi pi-fw pi-home',
                        command: () => {
                            router.push('/reservations/day');
                        },
                        
                    },
                    {
                        key: 'dashboard',
                        label: 'ダッシュボード',
                        icon: 'pi pi-fw pi-chart-bar',                        
                        command: () => {
                            router.push('/dashboard');
                        },
                    },
                    {
                        key: 'reservations',
                        label: '予約',                        
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
                                label: '予約カレンダー', 
                                icon: 'pi pi-fw pi-calendar', 
                                command: () => {
                                    router.push('/reservations/calendar');
                                },                                
                            },
                            { 
                                key: 'reservationsList',
                                label: '予約一覧', 
                                icon: 'pi pi-fw pi-list', 
                                command: () => {
                                    router.push('/reservations/list');
                                },                                
                            },
                        ],
                    },
                    {
                        key: 'billing',
                        label: '請求',                        
                        items: [                            
                            { 
                                label: '請求書',
                                icon: 'pi pi-fw pi-file',
                                command: () => {
                                    router.push('/billing/invoices');
                                },
                            },
                        ],
                    },
                    {
                        key: 'reports',
                        label: 'レポート',
                        icon: 'pi pi-fw pi-file',
                        items: [
                            /*
                            { 
                                label: '日次レポート', 
                                icon: 'pi pi-fw pi-calendar',
                                command: () => {
                                    router.push('/report/daily');
                                },                                 
                            },
                            */
                            { 
                                label: '月次レポート', 
                                icon: 'pi pi-fw pi-calendar-plus', 
                                command: () => {
                                    router.push('/report/monthly');
                                },
                            },
                        ],
                    },
            ]);
            const showDrawer = ref(false);
            const isAdmin = ref(false);
            const isClientEditor = ref(false);            
            const userMessage = ref(null);

            const userGreeting = computed(() => {
                const now = new Date();
                const hour = now.getHours();

                if (hour >= 5 && hour < 10) {
                    userMessage.value = 'おはようございます、' + logged_user.value[0]?.name;
                    // Good morning (5:00 AM - 9:59 AM)
                } else if (hour >= 10 && hour < 17) {
                    userMessage.value = 'こんにちは、' + logged_user.value[0]?.name;
                    // Good afternoon (10:00 AM - 4:59 PM)
                } else {
                    userMessage.value = 'こんばんは、' + logged_user.value[0]?.name;
                    // Good evening (5:00 PM - 4:59 AM)
                }
                
                return userMessage;
            });

            // Handle notification click
            const goToEditReservationPage = async (hotel_id, reservation_id) => {
                await setHotelId(hotel_id);
                await setReservationId(reservation_id);

                // console.log('SideMenu goToEditReservationPage:', hotel_id, reservation_id)
                
                showDrawer.value = false;

                router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });                          
            }; 
            const goToNewReservation = () => {                
                setReservationId(null);                
                router.push({ name: 'ReservationsNew' });
            };
            
            onMounted(() => {
                fetchHotels();
            });
            onMounted( async () => {
                await fetchUser();
                // console.log('Logged user:',logged_user.value);
                if(!logged_user.value?.[0]?.permissions?.manage_db || !logged_user.value?.[0]?.permissions?.manage_users){
                    isAdmin.value = false;
                }else{
                    isAdmin.value = true;
                }

                if(!logged_user.value?.[0]?.permissions?.manage_clients){
                    isClientEditor.value = false;
                }else{
                    isClientEditor.value = true;
                }
                
                //console.log(isAdmin.value)
                await fetchMyHoldReservations();                
            });
/*
            watch(hotels, (newVal, oldVal) => {
                // console.log('hotels changed from', oldVal, 'to', newVal);
            });
*/
            watch(
                selectedHotelId,
                (newVal, oldVal) => {                    
                    if (newVal) {
                        // console.log(`Hotel ID ${newVal} is being provided by SideMenu.`);
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
                isAdmin,
                isClientEditor,
                userGreeting,             
                goToEditReservationPage,
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
</style>
