<template>
    <div class="flex bg-gray-100 m-0 p-0 block md:hidden">
        <!-- Menubar for Sidebar -->
        <Menubar :model="items" class="w-full mb-4">
            <template #end>
                <div class="flex items-center space-x-4 mt-4">
                    <!-- Home Router Link with Icon in the Menubar -->
                    <router-link
                        to="/"
                        class="text-primary hover:bg-yellow-100 p-2 block rounded mt-4 flex items-center"
                    >
                        <i class="pi pi-home"></i>                        
                    </router-link>
                    <button
                        @click="handleLogout"
                        class="w-full text-red-500 bg-transparent hover:bg-red-500 hover:border-red-500 p-2 block rounded mt-4"
                    >
                        <i class="pi pi-sign-out"></i>                        
                    </button>
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
                    class="text-white p-2 block rounded"
                >
                    <h2 class="text-xl font-semibold">管理者パネル</h2>
                </router-link>
                <Button
                    type="button"
                    label="すべて切り替え"
                    severity="secondary"
                    text
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
                    class="text-white hover:bg-yellow-100 p-2 block rounded mt-4"
                >
                <i class="pi pi-home mr-2"></i>ホームへ戻る                    
                </router-link>
                <button
                    @click="handleLogout"
                    class="w-full text-white bg-transparent hover:bg-red-500 hover:border-red-500 p-2 block rounded mt-4"
                >
                    <i class="pi pi-sign-out mr-2"></i>ログアウト
                </button>
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
                            <div class="flex-grow h-16">
                                <h3 class="text-lg font-semibold text-blue-800">ログイン中ユーザー</h3>
                            </div>
                            <div class="mt-auto h-12">
                                <p class="text-3xl font-bold text-blue-600">{{ activeUsers }}</p>
                            </div>
                        </div>

                        <div class="bg-green-50 p-6 rounded-lg flex flex-col">
                            <div class="flex-grow h-16">
                                <h3 class="text-lg font-semibold text-green-800">ホテル</h3>
                            </div>
                            <div class="mt-auto h-12">
                                <p class="text-3xl font-bold text-green-600">{{ hotelCount }}</p>
                            </div>
                        </div>

                        <div class="bg-purple-50 p-6 rounded-lg flex flex-col">
                            <div class="flex-grow h-16">
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
  
<script>
    import { ref, onMounted } from 'vue';
    import { useRouter } from 'vue-router';
    import { useUserStore } from '@/composables/useUserStore';
    import Menubar from 'primevue/menubar';
    import PanelMenu from 'primevue/panelmenu';
    import Button from 'primevue/button';
    export default {
        name: 'Dashboard',
        components: {
            Menubar,
            PanelMenu,
            Button,
        },
        computed: {
            isRootAdminPath() {
                return this.$route.path === '/admin'
            }
        },
        data() {
            return {
                activeUsers: 0
            }
        },
        setup() {
            const router = useRouter();
            const { logged_user, fetchUser } = useUserStore();       
            const hotelCount = ref(0);
            const expandedKeys = ref({});            
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
                    ],
                },
                {
                    key: 'manage-ota',
                    label: 'OTA Exchange',
                    icon: 'pi pi-arrow-right-arrow-left',
                    command: () => {
                        router.push('/admin/ota');
                    }
                },         
            ]);
            const userName = ref('');
            
            const toggleAll = () => {
                if (Object.keys(expandedKeys.value).length) collapseAll();
                else expandAll();
            }

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

            const fetchHotels = async () => {
                try {
                    const response = await fetch('/api/hotel-list', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json',
                    },
                    });                    
                    const hotels = await response.json();
                    hotelCount.value = hotels.length;
                } catch (error) {
                    console.error('Error fetching hotels:', error);
                }
            };

            onMounted( async () => {
                await fetchHotels();
                await fetchUser();
                userName.value = logged_user.value[0]?.name + '、';
            });

            return {
                userName,
                hotelCount,
                expandedKeys,
                items,
                toggleAll,
            };
        },
        methods: {
            async fetchActiveUsers() {
                try {
                    const response = await fetch('/api/auth/active-users');
                    const data = await response.json();
                    this.activeUsers = data.activeUsers;                    
                } catch (err) {
                    console.error('Failed to fetch active users:', err);
                }
            },
            handleLogout() {
                // Clear user session or token
                localStorage.removeItem('authToken'); // Example token removal
                this.$router.push('/login'); // Redirect to login page
            },

        },
        mounted() {
            this.$primevue.config.ripple = true;
            this.fetchActiveUsers();
            // Update every 30 seconds
            setInterval(this.fetchActiveUsers, 30000);
        }
    };
  </script>
  
  <style scoped>
  /* You can add any custom styles here */
  @media (max-width: 768px) {
        .hidden.md\\:block {
            display: none;
        }
    }
  </style>
  