<template>
    <div class="flex bg-gray-100 m-0 p-0 block md:hidden">
        <!-- Menubar for Sidebar -->
        <Menubar :model="items" class="w-full mb-4">
            <template #end>
                <div class="flex items-center gap-4 mt-4">
                    <!-- Home Router Link with Icon in the Menubar -->
                    <router-link
                        to="/"
                        class="text-primary hover:bg-yellow-100 p-2 block rounded-sm flex items-center"
                    >
                        <i class="pi pi-home"></i>                        
                    </router-link>
                    <Button
                        @click="handleLogout"
                        severity="danger"
                    >
                        <i class="pi pi-sign-out"></i>                        
                    </Button>
                </div>
            </template>
        </Menubar>
    </div>
    <div class="flex min-h-screen bg-gray-100 m-0 p-0">
        <!-- Sidebar -->
        <div class="max-w-xs w-full min-h-screen bg-yellow-500 text-white m-0 p-4 flex flex-col h-full hidden md:block">
            <!-- Title: Admin Dashboard -->
            <div class="flex justify-between items-center mb-6">
                <router-link
                    to="/admin"
                    class="text-white p-2 block rounded-sm"
                >
                    <h2 class="text-xl text-white font-semibold">管理者パネル</h2>
                </router-link>
                <Button
                    type="button"
                    label="すべて切り替え"
                    severity="secondary"                    
                    @click="toggleAll"
                />
            </div>

            <!-- PanelMenu -->
            <PanelMenu v-model:expandedKeys="expandedKeys" :model="items">
                <template #item="{ item }">
                    <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
                        <a v-ripple class="flex items-center cursor-pointer text-surface-700 dark:text-surface-0 px-4 py-2" :href="href" @click="navigate">
                            <span :class="item.icon" />
                            <span class="ml-2">{{ item.label }}</span>
                        </a>
                    </router-link>
                        <a v-else v-ripple class="flex items-center cursor-pointer text-surface-700 dark:text-surface-0 px-4 py-2" :href="item.url" :target="item.target">
                            <span :class="item.icon" />
                            <span class="ml-2">{{ item.label }}</span>
                            <span v-if="item.items" class="pi pi-angle-down text-primary ml-auto" />
                        </a>                    
                </template>

            </PanelMenu>

            <!-- Back to Home and Logout Links -->
            <div class="mt-auto">
                <router-link
                    to="/"
                    class="bg-emerald-500 hover:bg-emerald-600 p-2 block rounded-sm mt-4 mb-2"
                >
                <i class="pi pi-home text-white mr-2"></i>
                <span class="text-white">PMS</span>
                </router-link>
                <Button
                    @click="handleLogout"
                    severity="danger"                        
                    fluid
                >
                    <i class="pi pi-sign-out mr-2"></i>ログアウト
                </Button>
            </div>
        </div>


        <!-- Main Content -->
        <div class="flex-1 overflow-x-hidden overflow-y-auto">
            <p class="text-2xl font-bold text-gray-700 mb-2">{{ userName }}管理者パネルへようこそ！</p>
            <div v-if="isRootAdminPath" class="p-4">
                <!-- Dashboard Content -->
                <div class="bg-white rounded-lg shadow-lg p-8">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">アドミンダッシュボード</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <!-- Quick Stats Cards -->
                        <div class="bg-blue-50 p-6 rounded-lg flex flex-col">
                            <div class="grow h-16">
                                <h3 class="text-lg font-semibold text-blue-800">ログイン中ユーザー</h3>
                            </div>
                            <div class="mt-auto h-12">
                                <p class="text-3xl font-bold text-blue-600">{{ activeUsers }}</p>
                            </div>
                        </div>

                        <div class="bg-green-50 p-6 rounded-lg flex flex-col">
                            <div class="grow h-16">
                                <h3 class="text-lg font-semibold text-green-800">ホテル</h3>
                            </div>
                            <div class="mt-auto h-12">
                                <p class="text-3xl font-bold text-green-600">{{ hotelCount }}</p>
                            </div>
                        </div>

                        <div class="bg-purple-50 p-6 rounded-lg flex flex-col">
                            <div class="grow h-16">
                                <h3 class="text-lg font-semibold text-purple-800">予約数</h3>
                            </div>
                            <div class="mt-auto h-12">
                                <p class="text-3xl font-bold text-purple-600">0</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            
            <router-view v-else />

        </div>
    </div>
  </template>
  
  <script setup>
    // Vue
    import { ref, computed, onMounted, onUnmounted } from 'vue';
    const router = useRouter();
    const route = useRoute();
    import { useRouter, useRoute } from 'vue-router';

    // Store
    import { useUserStore } from '@/composables/useUserStore';
    const { logged_user, fetchUser } = useUserStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, fetchHotels } = useHotelStore();       

    // Primevue
    import { Menubar, PanelMenu, Button } from 'primevue';
    import { usePrimeVue } from 'primevue/config';
    const primevue = usePrimeVue();

    const hotelCount = ref(0);
    const activeUsers = ref(0);
    const expandedKeys = ref({});
    const userName = ref('');            
                        
    const items = ref([
        {
            key: 'dashboard',
            label: 'ダッシュボード',
            icon: 'pi pi-tablet',
            command: () => {
                router.push('/admin');
            },
        },
        {                    
            key: 'manage-users',
            label: 'ユーザー管理',
            icon: 'pi pi-users',
            items: [
                {                 
                    key: 'mu-create-edit',
                    label: '新規 & 編集',
                    icon: 'pi pi-user',
                    command: () => {
                        router.push('/admin/users');
                    }                        
                },
                {
                    key: 'mu-roles',
                    label: 'ロール',
                    icon: 'pi pi-key',
                    command: () => {
                        router.push('/admin/roles');
                    }
                },
            ],
        },
        {
            key: 'manage-hotels',
            label: 'ホテル管理',
            icon: 'pi pi-building',
            items: [
                {                 
                    key: 'mh-create',
                    label: '新規',
                    icon: 'pi pi-plus',
                    command: () => {
                        router.push('/admin/hotel-create');
                    }                        
                },
                {                 
                    key: 'mh-edit',
                    label: '編集',
                    icon: 'pi pi-pen-to-square',
                    command: () => {
                        router.push('/admin/hotel-edit');
                    }                        
                },
                {                 
                    key: 'mh-plan',
                    label: 'プラン',
                    icon: 'pi pi-box',
                    command: () => {
                        router.push('/admin/hotel-plans');
                    }                        
                },
                {                 
                    key: 'mh-addon',
                    label: 'アドオン',
                    icon: 'pi pi-cart-plus',
                    command: () => {
                        router.push('/admin/hotel-addons');
                    }                        
                },
                {                 
                    key: 'mh-calendar',
                    label: 'カレンダー',
                    icon: 'pi pi-calendar',
                    command: () => {
                        router.push('/admin/hotel-calendar');
                    }                        
                },
            ],
        },
        {
            key: 'other-settings',
            label: 'その他設定',
            icon: 'pi pi-cog',
            command: () => {
                router.push('/admin/settings');
            }
        },
        {
            key: 'manage-ota',
            label: 'OTA Exchange',
            icon: 'pi pi-arrow-right-arrow-left',
            command: () => {
                router.push('/admin/ota');
            }
        },
        {
            key: 'import-data',
            label: '他社PMSデータインポート',
            icon: 'pi pi-file-import',
            command: () => {
                router.push('/admin/pms-import');
            }
        },
        {
            key: 'import-finances',
            label: '財務データ',
            icon: 'pi pi-wallet',
            command: () => {
                router.push('/admin/finances');
            }
        },
    ]);

    const isRootAdminPath = computed(() => route.path === '/admin');
            
    const toggleAll = () => {
        if (Object.keys(expandedKeys.value).length) collapseAll();
        else expandAll();
    };
    const expandAll = () => {
        for (let node of items.value) {
            expandNode(node);
        }

        expandedKeys.value = {...expandedKeys.value};
    };
    const collapseAll = () => {
        expandedKeys.value = {};
    };
    const expandNode = (node) => {
        if (node.items && node.items.length) {
            expandedKeys.value[node.key] = true;

            for (let child of node.items) {
                expandNode(child);
            }
        }
    };

    const fetchActiveUsers = async () => {
        try {
            const response = await fetch('/api/auth/active-users');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            activeUsers.value = data.activeUsers;
        } catch (err) {
            console.error('Failed to fetch active users:', err);
            // activeUsers.value = 0; // Optionally reset or set to a default on error
        }
    };

    const handleLogout = () => {
        // Clear user session or token
        localStorage.removeItem('authToken'); // Example token removal
        router.push('/login'); // Redirect to login page
    };

    let activeUsersInterval = null;

    onMounted( async () => {
        primevue.config.ripple = true;

        await fetchHotels();
        await fetchUser();
        
        hotelCount.value = hotels.value?.length || 0;
        if (Array.isArray(logged_user.value) && logged_user.value.length > 0 && logged_user.value[0]?.name) {
            userName.value = logged_user.value[0].name + '、';
        } else {
            userName.value = 'ユーザー、'; // Default or fallback name
        }

        fetchActiveUsers();
        activeUsersInterval = setInterval(fetchActiveUsers, 30000); // Update every 30 seconds
    });

    onUnmounted(() => {
        if (activeUsersInterval) {
            clearInterval(activeUsersInterval);
        }
    });    
        
</script>
  
<style scoped>
  
    @media (max-width: 768px) {
        .hidden.md\\:block {
            display: none;
        }
    }
</style>
  