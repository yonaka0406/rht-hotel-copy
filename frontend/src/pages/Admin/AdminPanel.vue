<template>
    <div class="flex min-h-screen bg-gray-100">
        <div :class="['bg-gradient-to-b from-yellow-400 to-yellow-700 text-white', 'flex-col h-screen sticky top-0', 'transition-all duration-300 ease-in-out', isCollapsed ? 'w-20' : 'w-64', 'hidden md:flex overflow-y-auto no-scroll']">
            <div :class="['p-4 border-b border-yellow-700', isCollapsed ? 'flex flex-col items-center' : 'flex items-center justify-between']">
                <div v-if="!isCollapsed" class="flex items-center">
                    <img src="@/assets/logo-simple.png" alt="管理者パネル" class="h-8 mr-2" />
                    <span class="text-xl font-semibold">管理者パネル</span>
                </div>
                <img v-else src="@/assets/logo-simple.png" alt="管理者パネル" class="h-8" />
                <Button
                    @click="toggleSidebar"
                    :icon="isCollapsed ? 'pi pi-arrow-right' : 'pi pi-arrow-left'"
                    text
                    rounded
                    class="p-button-secondary text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    :class="isCollapsed ? 'w-full justify-center mt-2' : ''"
                    aria-label="サイドバーの切り替え"
                />
            </div>

            <nav class="flex-1 space-y-1 mt-4 p-2">
                <template v-for="(item, index) in adminSidebarItems" :key="'desktop-' + item.key + '-' + index">
                    <div v-if="item.type === 'header'" :class="['px-4 py-2 text-xs text-yellow-300 uppercase font-semibold tracking-wider', isCollapsed ? 'text-center mt-2' : '']">
                        <span v-if="!isCollapsed">{{ item.label }}</span>
                        <i v-if="isCollapsed && item.icon" :class="[item.icon, 'text-lg']" :title="item.label"></i>
                        <hr v-if="isCollapsed && !item.icon" class="border-yellow-700 mt-1"> 
                    </div>
                    <router-link v-else-if="item.type === 'link'" :to="item.route" v-slot="{ href, navigate, isActive, isExactActive }" custom>
                        <a :href="href" @click="navigate"
                        :class="[
                            'flex items-center py-2.5 text-gray-200 hover:bg-yellow-700 hover:text-white rounded-lg transition-colors duration-200 group',
                            ( (isActive && item.route !== '/admin') || (isExactActive && item.route === '/admin') || ($route.path.startsWith(String(item.route)) && String(item.route) !== '/admin' && String(item.route).length > '/admin'.length && !$route.path.substring(String(item.route).length).startsWith('/')) ) ? 'bg-yellow-700 font-semibold' : '',
                            isCollapsed ? 'px-3 justify-center' : 'px-4'
                        ]">
                        <i :class="[item.icon, 'text-lg', isCollapsed ? '' : 'mr-3']"></i>
                        <span v-if="!isCollapsed" class="truncate">{{ item.label }}</span>
                        <span v-if="isCollapsed" class="absolute left-full rounded-md px-2 py-1 ml-3 bg-yellow-800 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 z-50 shadow-lg">
                            {{ item.label }}
                        </span>
                        </a>
                    </router-link>
                    <Divider v-if="item.type === 'separator'" class="my-2 !border-yellow-700" :class="isCollapsed ? 'mx-2' : 'mx-4'" />
                </template>
            </nav>

            <div :class="['mt-auto mb-4 space-y-2', isCollapsed ? 'px-2' : 'px-4']">
                <router-link to="/" :class="['flex items-center py-2.5 text-gray-200 hover:bg-yellow-700 hover:text-white rounded-lg transition-colors duration-200 group', isCollapsed ? 'px-3 justify-center' : 'px-4']">
                <i :class="['pi pi-home text-lg', isCollapsed ? '' : 'mr-3']"></i>
                <span v-if="!isCollapsed">PMSホーム</span>
                <span v-if="isCollapsed" class="absolute left-full rounded-md px-2 py-1 ml-3 bg-yellow-800 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 z-50 shadow-lg">PMSホーム</span>
                </router-link>                
                <Button @click="handleLogout"
                    :class="[
                        'flex items-center w-full py-2.5 text-white',
                        '!bg-red-500 !border !border-red-500',
                        'hover:!bg-red-600 hover:!border-red-600',
                        'rounded-lg transition-colors duration-200 group',
                        'focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 focus:!border-red-600',
                        isCollapsed ? 'px-3 justify-center' : 'px-4'
                    ]">
                    <i :class="['pi pi-sign-out text-lg', isCollapsed ? '' : 'mr-3']"></i>
                    <span v-if="!isCollapsed">ログアウト</span>
                    <span v-if="isCollapsed" class="absolute left-full rounded-md px-2 py-1 ml-3 bg-red-600 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 z-50 shadow-lg">ログアウト</span>
                </Button>
            </div>
            <div :class="['p-3 border-t border-yellow-700', isCollapsed ? 'text-center' : 'text-left']">
                <p v-if="!isCollapsed" class="text-xs text-yellow-300">© {{ new Date().getFullYear() }} WeHub.work</p>
                <p v-if="isCollapsed" class="text-xs text-yellow-300">©{{ new Date().getFullYear() }}</p>
            </div>

        </div>  
        
        <div class="flex-1 flex flex-col min-w-0"> <div class="md:hidden bg-white shadow-md sticky top-0 z-30">
            <Menubar :model="adminMobileMenuItems" class="w-full !border-0 !rounded-none !py-0">
            <template #start>
                <div class="flex items-center">
                <Button icon="pi pi-bars" @click="mobileSidebarVisible = true" text class="mr-1 !text-gray-600" />
                <img src="@/assets/logo-simple.png" alt="管理者" class="h-7" />
                </div>
            </template>
            <template #end>
                <div class="flex items-center gap-2">
                <span class="text-sm text-gray-700">{{ userNameDisplayShort }}</span>
                <Button @click="handleLogout" icon="pi pi-sign-out" severity="danger" text rounded aria-label="ログアウト" class="!text-red-500" />
                </div>
            </template>
            </Menubar>
        </div>
        
        <Drawer v-model:visible="mobileSidebarVisible" position="left" class="w-[18rem] md:hidden">
            <div class="flex flex-col h-full">
                <div class="flex items-center p-4 border-b">
                    <img src="@/assets/logo-simple.png" alt="管理者パネル" class="h-8 mr-2" />
                    <span class="text-xl font-semibold text-gray-800">管理者パネル</span>
                </div>
                <nav class="flex-1 space-y-1 p-4 overflow-y-auto">
                    <template v-for="(item, index) in adminSidebarItems" :key="'mobile-' + item.key + '-' + index">
                    <div v-if="item.type === 'header'" class="px-2 py-2 text-xs text-gray-500 uppercase font-semibold tracking-wider mt-1">
                        {{ item.label }}
                    </div>
                    <router-link v-else-if="item.type === 'link'" :to="item.route" v-slot="{ href, navigate, isActive, isExactActive }" custom>
                        <a :href="href" @click="navigate($event); mobileSidebarVisible = false;"
                        :class="['flex items-center py-2.5 px-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 group',
                                    ( (isActive && item.route !== '/admin') || (isExactActive && item.route === '/admin') || ($route.path.startsWith(String(item.route)) && String(item.route) !== '/admin' && String(item.route).length > '/admin'.length && !$route.path.substring(String(item.route).length).startsWith('/')) ) ? 'bg-gray-200 font-semibold' : '']">
                        <i :class="[item.icon, 'text-lg mr-3 text-gray-600']"></i>
                        <span class="truncate">{{ item.label }}</span>
                        </a>
                    </router-link>
                    <Divider v-if="item.type === 'separator'" class="my-2" />
                    </template>
                </nav>
                <div class="mt-auto p-4 border-t space-y-2">
                    <router-link to="/" @click="mobileSidebarVisible = false" class="flex items-center py-2.5 px-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 group">
                        <i class="pi pi-home text-lg mr-3 text-gray-600"></i>
                        <span>PMSホーム</span>
                    </router-link>
                    <Button @click="handleLogoutAndCloseMobileSidebar" text class="flex items-center w-full py-2.5 px-3 !text-red-500 hover:!bg-red-50 rounded-lg transition-colors duration-200 group">
                        <i class="pi pi-sign-out text-lg mr-3"></i>
                        <span>ログアウト</span>
                    </Button>
                </div>
            </div>
        </Drawer>

        <main class="flex-1 p-4 lg:p-6 overflow-y-auto">
            <p class="text-2xl font-semibold text-gray-800 mb-4">{{ userNameDisplay }}管理者パネルへようこそ！</p>
            <div v-if="isRootAdminPath" class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-6">アドミンダッシュボード</h2>
            <!-- Grid layout for stat cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div class="bg-blue-50 p-5 rounded-lg flex flex-col shadow">
                    <div class="grow min-h-[3rem]">
                        <h3 class="text-md font-semibold text-blue-800">ログイン中ユーザー</h3>
                    </div>
                    <div class="mt-auto">
                        <p class="text-3xl font-bold text-blue-600">{{ activeUsers }}</p>
                    </div>
                </div>
                <div class="bg-green-50 p-5 rounded-lg flex flex-col shadow">
                    <div class="grow min-h-[3rem]">
                        <h3 class="text-md font-semibold text-green-800">ホテル</h3>
                    </div>
                    <div class="mt-auto">
                        <p class="text-3xl font-bold text-green-600">{{ hotelCount }}</p>
                    </div>
                </div>                
                <div class="bg-purple-50 p-5 rounded-lg flex flex-col shadow">
                    <div class="grow min-h-[3rem]">
                        <h3 class="text-md font-semibold text-purple-800">本日の予約</h3>
                    </div>
                    <div class="mt-auto">
                        <p class="text-3xl font-bold text-purple-600">{{ reservationsTodayCount }}</p>
                        <p v-if="reservationsTodayValue > 0" class="text-sm text-purple-500">
                            ¥{{ reservationsTodayValue.toLocaleString() }}
                        </p>
                    </div>
                </div>
                <div class="bg-orange-50 p-5 rounded-lg flex flex-col shadow">
                    <div class="grow min-h-[3rem]">
                        <h3 class="text-md font-semibold text-orange-800">平均リードタイム</h3>
                    </div>
                    <div class="mt-auto">
                        <p class="text-3xl font-bold text-orange-600">
                            {{ averageLeadTimeDays !== null ? averageLeadTimeDays.toFixed(1) + ' 日' : 'N/A' }}
                        </p>
                        <p v-if="averageLeadTimeDays !== null" class="text-sm text-orange-500">本日の予約</p>
                    </div>
                </div>
                <div class="bg-red-50 p-5 rounded-lg flex flex-col shadow">
                    <div class="grow min-h-[3rem]">
                        <h3 class="text-md font-semibold text-red-800">順番待ち</h3>
                    </div>
                    <div class="mt-auto">
                        <p class="text-3xl font-bold text-red-600">{{ waitlistCount }}</p>
                        <p class="text-sm text-red-500">待機中</p>
                    </div>
                </div>                
            </div>
            </div>
            <router-view v-else />
        </main>
        </div>
    </div>

  </template>
  
  <script setup>
    // Vue
    import { ref, computed, onMounted, onUnmounted } from 'vue';
    import { useRouter, useRoute } from 'vue-router';    
    const router = useRouter();
    const route = useRoute();    

    // Store
    import { useUserStore } from '@/composables/useUserStore';
    const { logged_user, fetchUser } = useUserStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, fetchHotels } = useHotelStore(); 
    import { useMetricsStore } from '@/composables/useMetricsStore';
    const { reservationsToday, averageBookingLeadTime, waitlistEntriesToday, fetchReservationsToday, fetchBookingLeadTime, fetchWaitlistEntriesToday } = useMetricsStore();

    // Primevue Components
    import Menubar from 'primevue/menubar';
    import Button from 'primevue/button';
    import Divider from 'primevue/divider';
    import Drawer from 'primevue/drawer';
    import { usePrimeVue } from 'primevue/config';
    const primevue = usePrimeVue();

    const hotelCount = ref(0);
    const activeUsers = ref(0);    
    const userName = ref('');
    
    // Reactive variables
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDateString = `${year}-${month}-${day}`;
    const reservationsTodayCount = ref(0);
    const reservationsTodayValue = ref(0);
    
    const averageLeadTimeDays = ref(0);    
    const waitlistCount = ref(0);

    const isCollapsed = ref(false);
    const mobileSidebarVisible = ref(false);

    const userNameDisplay = computed(() => userName.value || 'ユーザー、');
    const userNameDisplayShort = computed(() => (logged_user.value?.[0]?.name || 'ユーザー'));
                        
    const adminSidebarItems = ref([
        { key: 'dashboard', type: 'link', label: 'ダッシュボード', icon: 'pi pi-fw pi-tablet', route: '/admin' },
        { type: 'separator' },
        { key: 'manage-users-header', type: 'header', label: 'ユーザー管理', icon: 'pi pi-fw pi-users' },
        { key: 'mu-create-edit', type: 'link', label: '新規 & 編集', icon: 'pi pi-fw pi-user', route: '/admin/users' },
        { key: 'mu-roles', type: 'link', label: 'ロール', icon: 'pi pi-fw pi-key', route: '/admin/roles' },
        { type: 'separator' },
        { key: 'manage-hotels-header', type: 'header', label: 'ホテル管理', icon: 'pi pi-fw pi-building' },
        { key: 'mh-create', type: 'link', label: '新規', icon: 'pi pi-fw pi-plus', route: '/admin/hotel-create' },
        { key: 'mh-edit', type: 'link', label: '編集', icon: 'pi pi-fw pi-pen-to-square', route: '/admin/hotel-edit' },
        { key: 'mh-plan', type: 'link', label: 'プラン', icon: 'pi pi-fw pi-box', route: '/admin/hotel-plans' },
        { key: 'mh-addon', type: 'link', label: 'アドオン', icon: 'pi pi-fw pi-cart-plus', route: '/admin/hotel-addons' },
        { key: 'mh-calendar', type: 'link', label: 'カレンダー', icon: 'pi pi-fw pi-calendar', route: '/admin/hotel-calendar' },
        { type: 'separator' },
        { key: 'crm-settings-header', type: 'header', label: 'CRM 設定', icon: 'pi pi-fw pi-address-book' },
        { key: 'loyalty-tiers', type: 'link', label: 'ロイヤルティ層設定', icon: 'pi pi-fw pi-star', route: '/admin/loyalty-tiers' },
        { type: 'separator' },
        { key: 'other-settings', type: 'link', label: 'その他設定', icon: 'pi pi-fw pi-cog', route: '/admin/settings' },
        { key: 'manage-ota', type: 'link', label: 'OTA Exchange', icon: 'pi pi-fw pi-arrow-right-arrow-left', route: '/admin/ota' },
        { key: 'import-data', type: 'link', label: '他社PMSデータインポート', icon: 'pi pi-fw pi-file-import', route: '/admin/pms-import' },
        { key: 'import-finances', type: 'link', label: '財務データ', icon: 'pi pi-fw pi-wallet', route: '/admin/finances' },
    ]);

    const adminMobileMenuItems = ref([]); 

    const isRootAdminPath = computed(() => route.path === '/admin');

    const toggleSidebar = () => {
        isCollapsed.value = !isCollapsed.value;
    };           

    const fetchActiveUsers = async () => {
        try {
            const response = await fetch('/api/auth/active-users'); 
            if (!response.ok) {
                throw new Error(`HTTPエラー！ステータス: ${response.status}`);
            }
            const data = await response.json();
            activeUsers.value = data.activeUsers;
        } catch (err) {
            console.error('アクティブユーザーの取得に失敗しました:', err);
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        logged_user.value = null; 
        router.push('/login');
    };

    const handleLogoutAndCloseMobileSidebar = () => {
        mobileSidebarVisible.value = false;
        handleLogout();
    };

    let activeUsersInterval = null;

    onMounted(async () => {
        primevue.config.ripple = true;

        await fetchHotels(); 
        await fetchUser();
        
        hotelCount.value = hotels.value?.length || 0;
        if (logged_user.value && Array.isArray(logged_user.value) && logged_user.value.length > 0 && logged_user.value[0]?.name) {
            userName.value = logged_user.value[0].name + '、';
        } else {
            userName.value = 'ユーザー、'; 
        }

        if (isRootAdminPath.value) { 
            fetchActiveUsers();
            activeUsersInterval = setInterval(fetchActiveUsers, 30000); 
            
            let accumulatedReservationsCount = 0;
            let accumulatedReservationsValue = 0;
            let accumulatedWeightedLeadTime = 0;
            let accumulatedTotalNights = 0; 

            // Check if hotels.value is available and is an array
            if (hotels.value && Array.isArray(hotels.value)) {
                // Loop through each hotel in the hotels.value array
                for (const hotel of hotels.value) {
                    // Ensure the hotel object and its id property exist
                    if (hotel && typeof hotel.id !== 'undefined') {
                        try {
                            // --- Fetch and process reservations data ---                            
                            await fetchReservationsToday(hotel.id, todayDateString);
                            if (reservationsToday.value) {                                
                                accumulatedReservationsCount += Number(reservationsToday.value.reservationsCount) || 0;                             
                                accumulatedReservationsValue += Number(reservationsToday.value.reservationsValue) || 0;
                            } else {
                                console.warn(`ホテル ${hotel.id} の予約データが見つかりませんでした。`);
                            }

                            // --- Fetch and process booking lead time data ---
                            await fetchBookingLeadTime(hotel.id, 0, todayDateString);                            
                            if (averageBookingLeadTime.value) { // Ensure this variable name matches your implementation
                                const leadTime = Number(averageBookingLeadTime.value.average_lead_time) || 0;
                                const nights = Number(averageBookingLeadTime.value.total_nights) || 0;

                                if (nights > 0) { // Only consider if there are nights, to make lead time meaningful
                                    accumulatedWeightedLeadTime += leadTime * nights;
                                    accumulatedTotalNights += nights;
                                }
                            } else {
                                console.warn(`ホテル ${hotel.id} の予約リードタイムデータが見つかりませんでした。`);
                            }

                            // --- Fetch and process waitlist data ---
                            await fetchWaitlistEntriesToday(hotel.id, todayDateString);
                            if (waitlistEntriesToday.value) {
                                waitlistCount.value += Number(waitlistEntriesToday.value.waitlistCount) || 0;
                            } else {
                                console.warn(`ホテル ${hotel.id} のウェイトリストデータが見つかりませんでした。`);
                            }
                        } catch (error) {                            
                            console.error(`ホテル ${hotel.id} の予約取得エラー:`, error);
                        }
                    } else {
                        console.warn("IDがないためホテルをスキップします:", hotel);
                    }
                }
            } else {
                console.warn("hotels.valueが配列ではないか、未定義です。予約を処理できません。");
            }
            
            // After iterating through all hotels update the final reactive variables that store the total count and value.
            reservationsTodayCount.value = accumulatedReservationsCount;
            reservationsTodayValue.value = accumulatedReservationsValue;

            averageLeadTimeDays.value = accumulatedTotalNights > 0 ? accumulatedWeightedLeadTime / accumulatedTotalNights : 0;            
        }
    });

    onUnmounted(() => {
        if (activeUsersInterval) {
            clearInterval(activeUsersInterval);
        }
    });    
        
</script>
  
<style scoped>
  .no-scroll {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }
  .no-scroll::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
  .pi {
    line-height: inherit; /* Ensures PrimeIcons align well */
  }

  /* Adjust PrimeVue Menubar padding for mobile */
  :deep(.md\\:hidden .p-menubar) {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
  /* Custom styling for PrimeVue Sidebar header and footer */
  :deep(.p-sidebar .p-sidebar-header) {
    padding: 1rem; /* Adjust as needed */
  }
   :deep(.p-sidebar .p-sidebar-content) {
    padding: 0; 
  }
</style>
