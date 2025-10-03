<template>
    <div class="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <div
            :class="['bg-gradient-to-b from-yellow-400 to-yellow-700 dark:from-yellow-900 dark:to-gray-950 text-white', 'flex-col h-screen sticky top-0', 'transition-all duration-300 ease-in-out', isCollapsed ? 'w-20' : 'w-64', 'hidden md:flex overflow-y-auto no-scroll']">
            <div
                :class="['p-4 border-b border-yellow-700', isCollapsed ? 'flex flex-col items-center' : 'flex items-center justify-between']">
                <div v-if="!isCollapsed" class="flex items-center">
                    <img src="@/assets/logo-simple.png" alt="管理者パネル" class="h-8 mr-2" />
                    <span class="text-xl font-semibold">管理者パネル</span>
                </div>
                <img v-else src="@/assets/logo-simple.png" alt="管理者パネル" class="h-8" />
                <Button @click="toggleSidebar" :icon="isCollapsed ? 'pi pi-arrow-right' : 'pi pi-arrow-left'" text
                    rounded
                    class="p-button-secondary text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    :class="isCollapsed ? 'w-full justify-center mt-2' : ''" aria-label="サイドバーの切り替え" />
            </div>

            <nav class="flex-1 space-y-1 mt-4 p-2">
                <template v-for="(item, index) in adminSidebarItems" :key="'desktop-' + item.key + '-' + index">
                    <div v-if="item.type === 'header'"
                        :class="['px-4 py-2 text-xs text-yellow-300 uppercase font-semibold tracking-wider', isCollapsed ? 'text-center mt-2' : '']">
                        <span v-if="!isCollapsed">{{ item.label }}</span>
                        <i v-if="isCollapsed && item.icon" :class="[item.icon, 'text-lg']" :title="item.label"></i>
                        <hr v-if="isCollapsed && !item.icon" class="border-yellow-700 mt-1">
                    </div>
                    <router-link v-else-if="item.type === 'link'" :to="item.route"
                        v-slot="{ href, navigate, isActive, isExactActive }" custom>
                        <a :href="href" @click="navigate" :class="[
                            'flex items-center py-2.5 text-gray-200 hover:bg-yellow-700 hover:text-white rounded-lg transition-colors duration-200 group',
                            ((isActive && item.route !== '/admin') || (isExactActive && item.route === '/admin') || ($route.path.startsWith(String(item.route)) && String(item.route) !== '/admin' && String(item.route).length > '/admin'.length && !$route.path.substring(String(item.route).length).startsWith('/'))) ? 'bg-yellow-700 font-semibold' : '',
                            isCollapsed ? 'px-3 justify-center' : 'px-4'
                        ]">
                            <i :class="[item.icon, 'text-lg', isCollapsed ? '' : 'mr-3']"></i>
                            <span v-if="!isCollapsed" class="truncate">{{ item.label }}</span>
                            <span v-if="isCollapsed"
                                class="absolute left-full rounded-md px-2 py-1 ml-3 bg-yellow-800 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 z-50 shadow-lg">
                                {{ item.label }}
                            </span>
                        </a>
                    </router-link>
                    <Divider v-if="item.type === 'separator'" class="my-2 !border-yellow-700"
                        :class="isCollapsed ? 'mx-2' : 'mx-4'" />
                </template>
            </nav>

            <div :class="['mt-auto mb-4 space-y-2', isCollapsed ? 'px-2' : 'px-4']">
                <router-link to="/"
                    :class="['flex items-center py-2.5 text-gray-200 hover:bg-yellow-700 hover:text-white rounded-lg transition-colors duration-200 group', isCollapsed ? 'px-3 justify-center' : 'px-4']">
                    <i :class="['pi pi-home text-lg', isCollapsed ? '' : 'mr-3']"></i>
                    <span v-if="!isCollapsed">PMSホーム</span>
                    <span v-if="isCollapsed"
                        class="absolute left-full rounded-md px-2 py-1 ml-3 bg-yellow-800 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 z-50 shadow-lg">PMSホーム</span>
                </router-link>
                <Button @click="handleLogout" :class="[
                    'flex items-center w-full py-2.5 text-white',
                    '!bg-red-500 !border !border-red-500',
                    'hover:!bg-red-600 hover:!border-red-600',
                    'rounded-lg transition-colors duration-200 group',
                    'focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 focus:!border-red-600',
                    isCollapsed ? 'px-3 justify-center' : 'px-4'
                ]">
                    <i :class="['pi pi-sign-out text-lg', isCollapsed ? '' : 'mr-3']"></i>
                    <span v-if="!isCollapsed">ログアウト</span>
                    <span v-if="isCollapsed"
                        class="absolute left-full rounded-md px-2 py-1 ml-3 bg-red-600 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 z-50 shadow-lg">ログアウト</span>
                </Button>
            </div>
            <div :class="['p-3 border-t border-yellow-700', isCollapsed ? 'text-center' : 'text-left']">
                <p v-if="!isCollapsed" class="text-xs text-yellow-300">© {{ new Date().getFullYear() }} WeHub.work</p>
                <p v-if="isCollapsed" class="text-xs text-yellow-300">©{{ new Date().getFullYear() }}</p>
            </div>

        </div>

        <div class="flex-1 flex flex-col min-w-0">
            <div class="md:hidden bg-white dark:bg-gray-800 shadow-md sticky top-0 z-30">
                <Menubar :model="adminMobileMenuItems" class="w-full !border-0 !rounded-none !py-0">
                    <template #start>
                        <div class="flex items-center">
                            <Button icon="pi pi-bars" @click="mobileSidebarVisible = true" text
                                class="mr-1 !text-gray-600 dark:!text-gray-300" />
                            <img src="@/assets/logo-simple.png" alt="管理者" class="h-7" />
                        </div>
                    </template>
                    <template #end>
                        <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-700 dark:text-gray-300">{{ userNameDisplayShort }}</span>
                            <Button @click="handleLogout" icon="pi pi-sign-out" severity="danger" text rounded
                                aria-label="ログアウト" class="!text-red-500" />
                        </div>
                    </template>
                </Menubar>
            </div>

            <Drawer v-model:visible="mobileSidebarVisible" position="left" class="w-[18rem] md:hidden">
                <div class="flex flex-col h-full">
                    <div class="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <img src="@/assets/logo-simple.png" alt="管理者パネル" class="h-8 mr-2" />
                        <span class="text-xl font-semibold text-gray-800 dark:text-gray-200">管理者パネル</span>
                    </div>
                    <nav class="flex-1 space-y-1 p-4 overflow-y-auto">
                        <template v-for="(item, index) in adminSidebarItems" :key="'mobile-' + item.key + '-' + index">
                            <div v-if="item.type === 'header'"
                                class="px-2 py-2 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider mt-1">
                                {{ item.label }}
                            </div>
                            <router-link v-else-if="item.type === 'link'" :to="item.route"
                                v-slot="{ href, navigate, isActive, isExactActive }" custom>
                                <a :href="href" @click="navigate($event); mobileSidebarVisible = false;"
                                    :class="['flex items-center py-2.5 px-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 group',
                                        ((isActive && item.route !== '/admin') || (isExactActive && item.route === '/admin') || ($route.path.startsWith(String(item.route)) && String(item.route) !== '/admin' && String(item.route).length > '/admin'.length && !$route.path.substring(String(item.route).length).startsWith('/'))) ? 'bg-gray-200 dark:bg-gray-600 font-semibold' : '']">
                                    <i :class="[item.icon, 'text-lg mr-3 text-gray-600 dark:text-gray-400']"></i>
                                    <span class="truncate">{{ item.label }}</span>
                                </a>
                            </router-link>
                            <Divider v-if="item.type === 'separator'" class="my-2" />
                        </template>
                    </nav>
                    <div class="mt-auto p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <router-link to="/" @click="mobileSidebarVisible = false"
                            class="flex items-center py-2.5 px-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 group">
                            <i class="pi pi-home text-lg mr-3 text-gray-600 dark:text-gray-400"></i>
                            <span>PMSホーム</span>
                        </router-link>
                        <Button @click="handleLogoutAndCloseMobileSidebar" text
                            class="flex items-center w-full py-2.5 px-3 !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20 rounded-lg transition-colors duration-200 group">
                            <i class="pi pi-sign-out text-lg mr-3"></i>
                            <span>ログアウト</span>
                        </Button>
                    </div>
                </div>
            </Drawer>

            <main class="flex-1 p-4 lg:p-6 overflow-y-auto">
                <p class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{{ userNameDisplay
                    }}管理者パネルへようこそ！</p>
                <AdminDashboard v-if="isRootAdminPath" />                
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

// Primevue Components
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import Drawer from 'primevue/drawer';
import { usePrimeVue } from 'primevue/config';
const primevue = usePrimeVue();
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import { useToast } from 'primevue/usetoast';

// Components
import AdminDashboard from './components/AdminDashboard.vue';

const userName = ref('');

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
    { key: 'manage-parking-header', type: 'header', label: '駐車場管理', icon: 'pi pi-fw pi-car' },
    { key: 'mp-manage', type: 'link', label: '管理', icon: 'pi pi-fw pi-car', route: '/admin/manage-parking' },
    { type: 'separator' },
    { key: 'customer-management-header', type: 'header', label: '顧客管理', icon: 'pi pi-fw pi-address-book' },
    { key: 'loyalty-tiers', type: 'link', label: 'ロイヤルティ層設定', icon: 'pi pi-fw pi-star', route: '/admin/loyalty-tiers' },
    { key: 'waitlist-management', type: 'link', label: '順番待ち管理', icon: 'pi pi-fw pi-clock', route: '/admin/waitlist' },
    { type: 'separator' },
    { key: 'data-import-header', type: 'header', label: 'データインポート', icon: 'pi pi-fw pi-database' },
    { key: 'import-data', type: 'link', label: '他社PMSデータインポート', icon: 'pi pi-fw pi-file-import', route: '/admin/pms-import' },
    { key: 'import-finances', type: 'link', label: '財務データ', icon: 'pi pi-fw pi-wallet', route: '/admin/finances' },
    { type: 'separator' },
    { key: 'other-settings', type: 'link', label: 'その他設定', icon: 'pi pi-fw pi-cog', route: '/admin/settings' },
    { key: 'manage-ota', type: 'link', label: 'OTA Exchange', icon: 'pi pi-fw pi-arrow-right-arrow-left', route: '/admin/ota' },
]);

const adminMobileMenuItems = ref([]);

const isRootAdminPath = computed(() => route.path === '/admin');

const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value;
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

onMounted(async () => {
    primevue.config.ripple = true;

    await fetchUser();

    if (logged_user.value && Array.isArray(logged_user.value) && logged_user.value.length > 0 && logged_user.value[0]?.name) {
        userName.value = logged_user.value[0].name + '、';
    } else {
        userName.value = 'ユーザー、';
    }
});

onUnmounted(() => {
    // No dashboard-specific intervals to clear here anymore
});
</script>

<style scoped>
.no-scroll {
    -ms-overflow-style: none;
    /* IE and Edge */
    scrollbar-width: none;
    /* Firefox */
}

.no-scroll::-webkit-scrollbar {
    display: none;
    /* Chrome, Safari, Opera */
}

.pi {
    line-height: inherit;
    /* Ensures PrimeIcons align well */
}

/* Adjust PrimeVue Menubar padding for mobile */
:deep(.md\\:hidden .p-menubar) {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
}

/* Custom styling for PrimeVue Sidebar header and footer */
:deep(.p-sidebar .p-sidebar-header) {
    padding: 1rem;
    /* Adjust as needed */
}

:deep(.p-sidebar .p-sidebar-content) {
    padding: 0;
}
</style>
