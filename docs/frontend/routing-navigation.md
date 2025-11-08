# Routing and Navigation

This document describes the routing and navigation architecture of the WeHub.work Hotel Management System frontend, including route configuration, navigation patterns, and best practices.

## Overview

The application uses **Vue Router 4** for client-side routing, providing:
- Single-page application (SPA) navigation
- Route-based code splitting
- Navigation guards for authentication
- Dynamic route parameters
- Nested routes for complex layouts

## Router Configuration

### Basic Setup

The router is configured in `src/router/index.js`:

```javascript
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/composables/useAuthStore';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        // Routes defined here
    ]
});

export default router;
```

### Route Structure

```javascript
const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/pages/MainPage/Dashboard.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/pages/LoginPage.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/reservations',
        name: 'reservations',
        component: () => import('@/pages/MainPage/Reservations.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/reservations/:id',
        name: 'reservation-detail',
        component: () => import('@/pages/MainPage/ReservationDetail.vue'),
        meta: { requiresAuth: true },
        props: true
    },
    {
        path: '/clients',
        name: 'clients',
        component: () => import('@/pages/CRM/ClientList.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/clients/:id',
        name: 'client-detail',
        component: () => import('@/pages/CRM/ClientDetail.vue'),
        meta: { requiresAuth: true },
        props: true
    },
    {
        path: '/billing',
        name: 'billing',
        component: () => import('@/pages/MainPage/Billing.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/reports',
        name: 'reports',
        component: () => import('@/pages/Reporting/ReportDashboard.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/admin',
        name: 'admin',
        component: () => import('@/pages/Admin/AdminPanel.vue'),
        meta: { 
            requiresAuth: true,
            requiresAdmin: true
        }
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/pages/NotFound.vue')
    }
];
```

## Navigation Guards

### Global Before Guard

Authentication and authorization checks:

```javascript
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    
    // Check if route requires authentication
    if (to.meta.requiresAuth) {
        // Verify user is logged in
        if (!authStore.isAuthenticated.value) {
            // Redirect to login with return URL
            next({
                name: 'login',
                query: { redirect: to.fullPath }
            });
            return;
        }
        
        // Check admin requirement
        if (to.meta.requiresAdmin && !authStore.isAdmin.value) {
            // Redirect to home if not admin
            next({ name: 'home' });
            return;
        }
        
        // Check CRUD permissions
        if (to.meta.requiresCrud && !authStore.hasCrudPermission.value) {
            // Show error toast
            toast.add({
                severity: 'error',
                summary: '権限エラー',
                detail: 'この機能にアクセスする権限がありません',
                life: 3000
            });
            next(false);
            return;
        }
    }
    
    // Allow navigation
    next();
});
```

### Per-Route Guards

```javascript
{
    path: '/reservations/new',
    name: 'reservation-new',
    component: () => import('@/pages/MainPage/ReservationNew.vue'),
    meta: { requiresAuth: true },
    beforeEnter: (to, from, next) => {
        const authStore = useAuthStore();
        
        // Check if user has permission to create reservations
        if (!authStore.hasCrudPermission.value) {
            toast.add({
                severity: 'error',
                summary: '権限エラー',
                detail: '予約作成の権限がありません',
                life: 3000
            });
            next({ name: 'reservations' });
            return;
        }
        
        next();
    }
}
```

### Component Guards

```vue
<script setup>
import { onBeforeRouteLeave } from 'vue-router';
import { ref } from 'vue';

const hasUnsavedChanges = ref(false);

onBeforeRouteLeave((to, from, next) => {
    if (hasUnsavedChanges.value) {
        const answer = window.confirm('保存されていない変更があります。本当に離れますか？');
        if (answer) {
            next();
        } else {
            next(false);
        }
    } else {
        next();
    }
});
</script>
```

## Navigation Patterns

### Programmatic Navigation

#### Basic Navigation

```vue
<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goToReservations = () => {
    router.push({ name: 'reservations' });
};

const goToReservationDetail = (id) => {
    router.push({ 
        name: 'reservation-detail', 
        params: { id } 
    });
};

const goBack = () => {
    router.back();
};
</script>
```

#### Navigation with Query Parameters

```vue
<script setup>
const searchReservations = (searchParams) => {
    router.push({
        name: 'reservations',
        query: {
            search: searchParams.query,
            status: searchParams.status,
            dateFrom: searchParams.dateFrom,
            dateTo: searchParams.dateTo
        }
    });
};
</script>
```

#### Replace Navigation (No History Entry)

```vue
<script setup>
const redirectAfterLogin = () => {
    const redirect = route.query.redirect || '/';
    router.replace(redirect);
};
</script>
```

### Declarative Navigation

#### Router Link

```vue
<template>
    <!-- Basic link -->
    <router-link to="/reservations">予約一覧</router-link>
    
    <!-- Named route -->
    <router-link :to="{ name: 'reservations' }">予約一覧</router-link>
    
    <!-- With parameters -->
    <router-link :to="{ name: 'reservation-detail', params: { id: reservation.id } }">
        詳細を表示
    </router-link>
    
    <!-- With query parameters -->
    <router-link :to="{ name: 'reservations', query: { status: 'confirmed' } }">
        確認済み予約
    </router-link>
    
    <!-- Custom styling -->
    <router-link 
        to="/reservations"
        class="text-blue-600 hover:text-blue-800"
        active-class="font-bold text-blue-900"
    >
        予約一覧
    </router-link>
</template>
```

## Route Parameters

### Dynamic Route Parameters

```javascript
// Route definition
{
    path: '/reservations/:id',
    name: 'reservation-detail',
    component: ReservationDetail,
    props: true
}
```

```vue
<!-- Component using route params -->
<script setup>
import { defineProps, onMounted } from 'vue';
import { useRoute } from 'vue-router';

// Option 1: Using props (recommended)
const props = defineProps({
    id: {
        type: String,
        required: true
    }
});

// Option 2: Using route object
const route = useRoute();
const reservationId = route.params.id;

onMounted(() => {
    loadReservation(props.id);
});
</script>
```

### Optional Parameters

```javascript
{
    path: '/clients/:id?',
    name: 'clients',
    component: ClientList
}
```

### Multiple Parameters

```javascript
{
    path: '/hotels/:hotelId/rooms/:roomId',
    name: 'room-detail',
    component: RoomDetail,
    props: true
}
```

## Query Parameters

### Reading Query Parameters

```vue
<script setup>
import { useRoute, useRouter } from 'vue-router';
import { watch } from 'vue';

const route = useRoute();
const router = useRouter();

// Access query parameters
const searchQuery = route.query.search;
const status = route.query.status;

// Watch for query parameter changes
watch(() => route.query, (newQuery) => {
    console.log('Query changed:', newQuery);
    loadDataWithFilters(newQuery);
}, { immediate: true });
</script>
```

### Updating Query Parameters

```vue
<script setup>
const updateFilters = (filters) => {
    router.push({
        query: {
            ...route.query,
            ...filters
        }
    });
};

const clearFilters = () => {
    router.push({
        query: {}
    });
};
</script>
```

## Nested Routes

### Parent-Child Route Structure

```javascript
{
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
        {
            path: '',
            name: 'admin-dashboard',
            component: AdminDashboard
        },
        {
            path: 'users',
            name: 'admin-users',
            component: UserManagement
        },
        {
            path: 'settings',
            name: 'admin-settings',
            component: SystemSettings
        }
    ]
}
```

### Layout Component with Router View

```vue
<!-- AdminLayout.vue -->
<template>
    <div class="admin-layout">
        <aside class="sidebar">
            <nav>
                <router-link :to="{ name: 'admin-dashboard' }">ダッシュボード</router-link>
                <router-link :to="{ name: 'admin-users' }">ユーザー管理</router-link>
                <router-link :to="{ name: 'admin-settings' }">設定</router-link>
            </nav>
        </aside>
        
        <main class="content">
            <router-view />
        </main>
    </div>
</template>
```

## Navigation Menu Implementation

### Side Navigation Menu

```vue
<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/composables/useAuthStore';

const route = useRoute();
const authStore = useAuthStore();

const menuItems = computed(() => [
    {
        label: 'ダッシュボード',
        icon: 'pi pi-home',
        to: { name: 'home' },
        visible: true
    },
    {
        label: '予約',
        icon: 'pi pi-calendar',
        to: { name: 'reservations' },
        visible: true
    },
    {
        label: '顧客',
        icon: 'pi pi-users',
        to: { name: 'clients' },
        visible: true
    },
    {
        label: '請求',
        icon: 'pi pi-money-bill',
        to: { name: 'billing' },
        visible: true
    },
    {
        label: 'レポート',
        icon: 'pi pi-chart-bar',
        to: { name: 'reports' },
        visible: true
    },
    {
        label: '管理',
        icon: 'pi pi-cog',
        to: { name: 'admin' },
        visible: authStore.isAdmin.value
    }
].filter(item => item.visible));

const isActive = (routeName) => {
    return route.name === routeName;
};
</script>

<template>
    <nav class="side-nav">
        <router-link
            v-for="item in menuItems"
            :key="item.label"
            :to="item.to"
            class="nav-item"
            :class="{ 'active': isActive(item.to.name) }"
        >
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
        </router-link>
    </nav>
</template>

<style scoped>
.nav-item {
    @apply flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors;
}

.nav-item.active {
    @apply bg-blue-50 text-blue-600 font-semibold;
}
</style>
```

### Breadcrumb Navigation

```vue
<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const breadcrumbs = computed(() => {
    const crumbs = [];
    
    // Always add home
    crumbs.push({ label: 'ホーム', to: { name: 'home' } });
    
    // Add route-specific breadcrumbs
    if (route.name === 'reservations') {
        crumbs.push({ label: '予約一覧', to: { name: 'reservations' } });
    } else if (route.name === 'reservation-detail') {
        crumbs.push({ label: '予約一覧', to: { name: 'reservations' } });
        crumbs.push({ label: '予約詳細', to: route });
    } else if (route.name === 'clients') {
        crumbs.push({ label: '顧客一覧', to: { name: 'clients' } });
    }
    
    return crumbs;
});
</script>

<template>
    <nav class="breadcrumb">
        <router-link
            v-for="(crumb, index) in breadcrumbs"
            :key="index"
            :to="crumb.to"
            class="breadcrumb-item"
            :class="{ 'active': index === breadcrumbs.length - 1 }"
        >
            {{ crumb.label }}
            <i v-if="index < breadcrumbs.length - 1" class="pi pi-angle-right"></i>
        </router-link>
    </nav>
</template>
```

## Route Transitions

### Basic Transition

```vue
<template>
    <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
            <component :is="Component" />
        </transition>
    </router-view>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
```

### Slide Transition

```vue
<template>
    <router-view v-slot="{ Component }">
        <transition name="slide" mode="out-in">
            <component :is="Component" />
        </transition>
    </router-view>
</template>

<style>
.slide-enter-active,
.slide-leave-active {
    transition: transform 0.3s ease;
}

.slide-enter-from {
    transform: translateX(100%);
}

.slide-leave-to {
    transform: translateX(-100%);
}
</style>
```

## Lazy Loading Routes

### Code Splitting by Route

```javascript
const routes = [
    {
        path: '/reservations',
        name: 'reservations',
        // Lazy load component
        component: () => import('@/pages/MainPage/Reservations.vue')
    },
    {
        path: '/reports',
        name: 'reports',
        // Lazy load with custom chunk name
        component: () => import(/* webpackChunkName: "reports" */ '@/pages/Reporting/ReportDashboard.vue')
    }
];
```

### Prefetching Routes

```javascript
{
    path: '/reservations',
    name: 'reservations',
    component: () => import(/* webpackPrefetch: true */ '@/pages/MainPage/Reservations.vue')
}
```

## Best Practices

### 1. Use Named Routes

```vue
<!-- ✅ Correct -->
<router-link :to="{ name: 'reservation-detail', params: { id: reservation.id } }">
    詳細
</router-link>

<!-- ❌ Avoid -->
<router-link :to="`/reservations/${reservation.id}`">
    詳細
</router-link>
```

### 2. Use Route Props

```javascript
// ✅ Correct
{
    path: '/reservations/:id',
    component: ReservationDetail,
    props: true
}

// Component receives id as prop
const props = defineProps({ id: String });
```

### 3. Handle Navigation Errors

```vue
<script setup>
const navigateToReservation = async (id) => {
    try {
        await router.push({ name: 'reservation-detail', params: { id } });
    } catch (error) {
        if (error.name !== 'NavigationDuplicated') {
            console.error('Navigation error:', error);
        }
    }
};
</script>
```

### 4. Preserve Scroll Position

```javascript
const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        } else {
            return { top: 0 };
        }
    }
});
```

### 5. Use Meta Fields for Route Configuration

```javascript
{
    path: '/admin',
    meta: {
        requiresAuth: true,
        requiresAdmin: true,
        title: '管理画面',
        breadcrumb: '管理'
    }
}
```

## Troubleshooting

### Navigation Duplicated Error

```vue
<script setup>
// Catch and ignore duplicate navigation
router.push({ name: 'home' }).catch(err => {
    if (err.name !== 'NavigationDuplicated') {
        throw err;
    }
});
</script>
```

### Route Not Found

```javascript
// Add catch-all route
{
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound
}
```

## Related Documentation

- **[Frontend Development](README.md)** - Frontend overview
- **[Component Library](component-library.md)** - UI components
- **[State Management](state-management.md)** - Store patterns
- **[Testing Frontend](testing-frontend.md)** - Testing strategies

---

*This routing documentation provides comprehensive guidance for implementing navigation in the application.*
