<template>
    <nav class="mb-6">
        <ol class="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
            <li>
                <router-link to="/dashboard" class="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                    ホーム
                </router-link>
            </li>
            <li v-for="(crumb, index) in breadcrumbs" :key="index" class="flex items-center">
                <i class="pi pi-chevron-right mx-2 text-xs"></i>
                <router-link 
                    v-if="crumb.to && index < breadcrumbs.length - 1" 
                    :to="crumb.to" 
                    class="hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                    {{ crumb.label }}
                </router-link>
                <span v-else class="text-slate-900 dark:text-slate-100 font-medium">
                    {{ crumb.label }}
                </span>
            </li>
        </ol>
    </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const breadcrumbs = computed(() => {
    const crumbs = [];
    
    // Always add Accounting
    if (route.path === '/accounting/dashboard') {
        crumbs.push({ label: '会計' });
    } else if (route.path === '/accounting/ledger-export') {
        crumbs.push({ label: '会計', to: '/accounting/dashboard' });
        crumbs.push({ label: '帳票出力' });
    } else if (route.path.startsWith('/accounting')) {
        crumbs.push({ label: '会計' });
    }
    
    return crumbs;
});
</script>
