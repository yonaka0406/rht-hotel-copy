<template>
    <Drawer v-model:visible="mobileSidebarVisible" position="left" class="w-[18rem] md:hidden">
        <div class="flex flex-col h-full">
            <div class="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <img src="@/assets/logo-simple.png" alt="管理者パネル" class="h-8 mr-2" />
                <span class="text-xl font-semibold text-gray-800 dark:text-gray-200">管理者パネル</span>
            </div>
            <nav class="flex-1 space-y-1 p-4 overflow-y-auto max-h-[calc(100vh-160px)]">
                <template v-for="(item, index) in adminSidebarItems" :key="'mobile-' + item.key + '-' + index">
                    <div v-if="item.type === 'header'"
                        class="px-2 py-2 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider mt-1">
                        {{ item.label }}
                    </div>
                    <router-link v-else-if="item.type === 'link'" :to="item.route"
                        v-slot="{ href, navigate, isActive, isExactActive }" custom>
                        <a :href="href" @click="navigate($event); mobileSidebarVisible = false;"
                            :class="['flex items-center py-2.5 px-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 group',
                                ((isActive && item.route !== '/admin') || (isExactActive && item.route === '/admin') || ($route.path.startsWith(String(item.route)) && String(item.route).length > '/admin'.length && !$route.path.substring(String(item.route).length).startsWith('/'))) ? 'bg-gray-200 dark:bg-gray-600 font-semibold' : '']">
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
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';
import Drawer from 'primevue/drawer';
import Button from 'primevue/button';
import Divider from 'primevue/divider';

const props = defineProps({
    mobileSidebarVisible: Boolean,
    adminSidebarItems: Array,
    handleLogoutAndCloseMobileSidebar: Function,
});

const emit = defineEmits(['update:mobileSidebarVisible']);

const mobileSidebarVisible = computed({
    get: () => props.mobileSidebarVisible,
    set: (value) => emit('update:mobileSidebarVisible', value),
});
</script>
