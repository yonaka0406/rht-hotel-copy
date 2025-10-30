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

            <nav class="flex-1 space-y-1 mt-4 p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
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

            <AdminMobileSidebar v-model:mobileSidebarVisible="mobileSidebarVisible"
                :adminSidebarItems="adminSidebarItems"
                :handleLogoutAndCloseMobileSidebar="handleLogoutAndCloseMobileSidebar" />

            <main class="flex-1 p-4 lg:p-6 overflow-y-auto">
                <p class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{{ userNameDisplay }}さん、管理者パネルへようこそ！</p>
                <AdminDashboard v-if="isRootAdminPath" />                
                <router-view v-else />            </main>
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
import { usePrimeVue } from 'primevue/config';
const primevue = usePrimeVue();

// Components
import AdminDashboard from './components/AdminDashboard.vue';
import AdminMobileSidebar from './components/AdminMobileSidebar.vue';

const isCollapsed = ref(false);
const mobileSidebarVisible = ref(false);

const userNameDisplay = computed(() => logged_user.value?.[0]?.name ? `${logged_user.value[0].name}` : 'ユーザー');
const userNameDisplayShort = computed(() => (logged_user.value?.[0]?.name || 'ユーザー'));

// Composables
import { useAdminNavigation } from './composables/useAdminNavigation';
const { adminSidebarItems } = useAdminNavigation();

const adminMobileMenuItems = computed(() => adminSidebarItems.value);

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
