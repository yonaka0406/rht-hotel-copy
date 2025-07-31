<template>
  <div :class="[
    'bg-gradient-to-b from-emerald-500 to-emerald-600 dark:from-emerald-700 dark:to-emerald-800 text-white',
    'flex flex-col h-full',
    'transition-all duration-300 ease-in-out',
    'w-full',
    'hidden md:flex overflow-y-auto no-scroll'
  ]">
    <div
      :class="['p-4 border-b border-emerald-700 dark:border-emerald-600', isCollapsed ? 'flex flex-col items-center' : 'flex items-center justify-between']">
      <div v-if="!isCollapsed" class="flex items-center">
        <!-- Logo -->
        <img src="@/assets/logo-simple.png" alt="ホテル管理システム" class="h-8 mr-1" />
        <span class="text-2xl font-semibold">WeHub</span>
      </div>
      <img v-else="isCollapsed" src="@/assets/logo-simple.png" alt="ホテル管理システム" class="h-8 mr-1" />

      <Button @click="toggleSidebar"
        class="p-2 text-white rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
        :class="isCollapsed ? 'w-full justify-center' : ''" aria-label="サイドバーの切り替え">
        <i class="pi" :class="isCollapsed ? 'pi-chevron-right' : 'pi-chevron-left'"></i>
      </Button>
    </div>

    <nav class="flex-1 space-y-1 mt-4">
      <template v-for="(item, index) in menuItems" :key="index">
        <div v-if="item.type === 'header'"
          :class="['px-6 py-2 text-xs text-emerald-300 dark:text-emerald-200 uppercase font-semibold', isCollapsed ? 'text-center' : '']">
          <span v-if="!isCollapsed">{{ item.label }}</span>
          <i v-if="isCollapsed && item.icon" :class="[item.icon, 'text-lg']" :title="item.label"></i>
        </div>

        <router-link v-else-if="item.route && item.type === 'link'" :to="item.route"
          v-slot="{ href, navigate, isActive }" custom>
          <a :href="href" @click="item.command ? item.command() : navigate()" :class="[
            'flex items-center py-3 text-gray-200 dark:text-gray-300 hover:bg-emerald-700 dark:hover:bg-emerald-600 hover:text-white rounded-lg transition-colors duration-200 group',
            isActive ? 'bg-emerald-700 dark:bg-emerald-600 font-semibold' : '',
            isCollapsed ? 'px-0 justify-center' : 'px-6'
          ]">
            <i :class="[item.icon, 'text-lg', isCollapsed ? '' : 'mr-3']"></i>
            <span v-if="!isCollapsed" class="truncate">{{ item.label }}</span>
            <span v-if="isCollapsed"
              class="absolute left-full rounded-md px-2 py-1 ml-6 bg-emerald-700 dark:bg-emerald-600 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0">
              {{ item.label }}
            </span>
          </a>
        </router-link>

        <Divider v-if="item.separator" class="my-2 border-emerald-700 dark:border-emerald-600" />
      </template>
    </nav>

    <div :class="['mt-auto mb-4 space-y-2', isCollapsed ? 'px-2' : 'px-4']">
      <router-link v-if="isAdmin" to="/admin" :class="[
        'flex items-center py-3 text-gray-200 dark:text-gray-300 hover:bg-emerald-700 dark:hover:bg-emerald-600 hover:text-white rounded-lg transition-colors duration-200 group',
        $route.path.startsWith('/admin') ? 'bg-emerald-700 dark:bg-emerald-600 font-semibold' : '',
        isCollapsed ? 'px-0 justify-center' : 'px-6'
      ]">
        <i :class="['pi pi-cog text-lg', isCollapsed ? '' : 'mr-3']"></i>
        <span v-if="!isCollapsed">管理者パネル</span>
        <span v-if="isCollapsed"
          class="absolute left-full rounded-md px-2 py-1 ml-6 bg-emerald-700 dark:bg-emerald-600 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0">
          管理者パネル
        </span>
      </router-link>
      <router-link v-if="isClientEditor" to="/crm/dashboard" :class="[
        'flex items-center py-3 text-gray-200 dark:text-gray-300 hover:bg-emerald-700 dark:hover:bg-emerald-600 hover:text-white rounded-lg transition-colors duration-200 group',
        $route.path.startsWith('/crm') ? 'bg-emerald-700 dark:bg-emerald-600 font-semibold' : '',
        isCollapsed ? 'px-0 justify-center' : 'px-6'
      ]">
        <i :class="['pi pi-users text-lg', isCollapsed ? '' : 'mr-3']"></i>
        <span v-if="!isCollapsed">顧客情報</span>
        <span v-if="isCollapsed"
          class="absolute left-full rounded-md px-2 py-1 ml-6 bg-emerald-700 dark:bg-emerald-600 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0">
          顧客情報
        </span>
      </router-link>
      <router-link v-if="isReporting" to="/reporting" :class="[
        'flex items-center py-3 text-gray-200 dark:text-gray-300 hover:bg-emerald-700 dark:hover:bg-emerald-600 hover:text-white rounded-lg transition-colors duration-200 group',
        $route.path.startsWith('/reporting') ? 'bg-emerald-700 dark:bg-emerald-600 font-semibold' : '',
        isCollapsed ? 'px-0 justify-center' : 'px-6'
      ]">
        <i :class="['pi pi-book text-lg', isCollapsed ? '' : 'mr-3']"></i>
        <span v-if="!isCollapsed">レポート</span>
        <span v-if="isCollapsed"
          class="absolute left-full rounded-md px-2 py-1 ml-6 bg-emerald-700 dark:bg-emerald-600 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0">
          レポート
        </span>
      </router-link>
      <Button @click="handleLogout" severity="danger" :class="[
        'flex items-center w-full py-3 text-gray-200 dark:text-gray-300 hover:bg-red-700 dark:hover:bg-red-600 hover:text-white rounded-lg transition-colors duration-200 group',
        isCollapsed ? 'px-0 justify-center' : 'px-6'
      ]">
        <i :class="['pi pi-sign-out text-lg', isCollapsed ? '' : 'mr-3']"></i>
        <span v-if="!isCollapsed">ログアウト</span>
        <span v-if="isCollapsed"
          class="absolute left-full rounded-md px-2 py-1 ml-6 bg-red-700 dark:bg-red-600 text-white text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0">
          ログアウト
        </span>
      </Button>
    </div>

    <div :class="['p-4 mt-auto border-t border-emerald-700 dark:border-emerald-600', isCollapsed ? 'text-center' : '']">
      <p v-if="!isCollapsed" class="text-xs text-emerald-300 dark:text-emerald-200"> WeHub.work PMS</p>
      <p v-if="isCollapsed" class="text-xs text-emerald-300 dark:text-emerald-200"> WeHub.work</p>
    </div>
  </div>

  <div class="flex bg-gray-100 dark:bg-gray-800 m-0 p-0 block w-full md:hidden">
    <Menubar :model="menubarItems" class="w-full mb-2 dark:bg-gray-800 dark:text-white">
      <template #start>
        <img src="@/assets/logo-favi.png" alt="WeHub.work" class="h-8" />
      </template>
      <template #end>
        <div class="flex items-center gap-4">
          <span class="dark:text-white">{{ userGreeting }}</span>
          <OverlayBadge :value="holdReservations.length" class="mr-2">
            <button class="p-button p-button-text dark:text-white" aria-label="通知" @click="showDrawer = true">
              <i class="pi pi-bell" style="font-size:larger" />
            </button>
          </OverlayBadge>
          <Select name="hotel" v-model="selectedHotelId" :options="hotels" optionLabel="name" optionValue="id"
            :virtualScrollerOptions="{ itemSize: 38 }" class="w-48 dark:bg-gray-700 dark:text-white" placeholder="ホテル選択"
            filter />
          <Button @click="handleLogout" severity="danger">
            <i class="pi pi-sign-out"></i>
          </Button>
        </div>
      </template>
    </Menubar>

    <Drawer v-model:visible="showDrawer" position="right" :style="{ width: '300px' }" header="通知"
      class="dark:bg-gray-800 dark:text-white">
      <ul v-if="holdReservations.length">
        <li v-for="(reservation, index) in holdReservations" :key="index" class="m-2">
          <button @click="goToEditReservationPage(reservation.hotel_id, reservation.reservation_id)"
            class="dark:text-white dark:hover:bg-gray-700">
            <p>保留中予約を完成させてください:</p>
            {{ reservation.client_name }} @ {{ reservation.check_in }}
          </button>
          <Divider class="dark:border-gray-600" />
        </li>
      </ul>
      <p v-else class="text-center text-gray-500 dark:text-gray-400">通知はありません。</p>
    </Drawer>
  </div>
</template>

<script setup>
// Vue
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

// Define props
const props = defineProps({
  isCollapsed: {
    type: Boolean,
    required: true
  }
});

// Define emits
const emit = defineEmits(['toggle']);

// Stores
import { useUserStore } from '@/composables/useUserStore';
const { logged_user, fetchUser } = useUserStore();
import { useHotelStore } from '@/composables/useHotelStore';
const { hotels, selectedHotelId, setHotelId, fetchHotels, selectedHotel } = useHotelStore();
import { useReservationStore } from '@/composables/useReservationStore';
const { holdReservations, fetchMyHoldReservations, setReservationId } = useReservationStore();

// Primevue
import { Menubar, OverlayBadge, Select, Drawer, Divider, Button } from 'primevue';

// Function to update menu items
const updateMenuItems = () => {
  console.log('Updating menu items...');
  const items = [
    { label: 'ホーム', icon: 'pi pi-fw pi-home', route: '/reservations/day', type: 'link', command: () => router.push('/reservations/day') },
    { label: 'ダッシュボード', icon: 'pi pi-fw pi-chart-bar', route: '/dashboard', type: 'link', command: () => { router.push('/dashboard'); } },
    { label: '予約', type: 'header', icon: 'pi pi-calendar-plus' },
    { label: '新規予約', icon: 'pi pi-fw pi-plus-circle', route: '/reservations/new', type: 'link', command: () => goToNewReservation() },
    { label: '予約カレンダー', icon: 'pi pi-fw pi-calendar', route: '/reservations/calendar', type: 'link', command: () => router.push('/reservations/calendar') },
    { label: '予約一覧', icon: 'pi pi-fw pi-list', route: '/reservations/list', type: 'link', command: () => router.push('/reservations/list') },
  ];

  if (selectedHotel.value?.google_drive_url) {
    console.log('Adding 予約紹介 menu with URL:', selectedHotel.value.google_drive_url);
    items.push({
      label: '予約紹介',
      icon: 'pi pi-fw pi-google',
      type: 'link',
      route: '/google/dummy-route',
      command: () => {
        console.log('予約紹介 clicked, opening URL:', selectedHotel.value.google_drive_url);
        window.open(selectedHotel.value.google_drive_url, '_blank');
      }
    });
  } else {
    console.log('予約紹介 menu not added - missing google_drive_url');
  }

  items.push(
    { label: '月次集計', icon: 'pi pi-fw pi-calendar-plus', route: '/report/monthly', type: 'link', command: () => router.push('/report/monthly') },
    { label: '請求', type: 'header', icon: 'pi pi-file-edit' },
    { label: '請求書', icon: 'pi pi-fw pi-file', route: '/billing/invoices', type: 'link', command: () => router.push('/billing/invoices') },
    { label: '領収書', icon: 'pi pi-fw pi-receipt', route: '/billing/receipts', type: 'link', command: () => router.push({ name: 'Receipts' }) },
  );

  console.log('Final menu items:', JSON.stringify(items, null, 2));
  return items;
};

// Add a ref to store the menu items
const menuItems = ref(updateMenuItems());

// Watch for changes in selectedHotel and update menu items
watch(selectedHotel, () => {
  console.log('selectedHotel changed, updating menu items');
  menuItems.value = updateMenuItems();
}, { immediate: true });

// Add menubarItems computed property for mobile Menubar
const menubarItems = computed(() => {
  const items = [
    { label: 'ホーム', icon: 'pi pi-fw pi-home', command: () => router.push('/reservations/day') },
    { label: 'ダッシュボード', icon: 'pi pi-fw pi-chart-bar', command: () => router.push('/dashboard') },
    {
      label: '予約',
      icon: 'pi pi-calendar-plus',
      items: [
        { label: '新規予約', icon: 'pi pi-fw pi-plus', command: () => goToNewReservation() },
        { label: '予約カレンダー', icon: 'pi pi-fw pi-calendar', command: () => router.push('/reservations/calendar') },
        { label: '予約一覧', icon: 'pi pi-fw pi-list', command: () => router.push('/reservations/list') },
        { label: '月次集計', icon: 'pi pi-fw pi-calendar-plus', command: () => router.push('/report/monthly') },
      ]
    },
    {
      label: '請求',
      icon: 'pi pi-file-edit',
      items: [
        { label: '請求書', icon: 'pi pi-fw pi-file', command: () => router.push('/billing/invoices') },
        { label: '領収書', icon: 'pi pi-fw pi-receipt', command: () => router.push({ name: 'Receipts' }) },
      ]
    },
  ];
  if (logged_user.value && logged_user.value[0] && logged_user.value[0].permissions) {
    const permissions = logged_user.value[0].permissions;
    if (permissions.manage_db || permissions.manage_users) {
      items.push({ label: '管理者パネル', icon: 'pi pi-cog', command: () => router.push('/admin') });
    }
    if (permissions.manage_clients) {
      items.push({ label: '顧客情報', icon: 'pi pi-users', command: () => router.push('/crm/dashboard') });
    }
    if (permissions.view_reports) {
      items.push({ label: 'レポート', icon: 'pi pi-book', command: () => router.push('/reporting') });
    }
  }
  return items;
});

const showDrawer = ref(false);
const isAdmin = ref(false);
const isClientEditor = ref(false);
const isReporting = ref(false);

const userGreeting = computed(() => {
  if (!logged_user.value || !logged_user.value[0]) return '';
  const userName = logged_user.value[0]?.name || 'User';
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 5 && hour < 10) {
    return 'おはようございます、' + userName;
  } else if (hour >= 10 && hour < 17) {
    return 'こんにちは、' + userName;
  } else {
    return 'こんばんは、' + userName;
  }
});

const goToEditReservationPage = async (hotel_id, reservation_id) => {
  await setHotelId(hotel_id);
  await setReservationId(reservation_id);
  showDrawer.value = false;
  router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });
};

// Ensure goToNewReservation is defined
const goToNewReservation = () => {
  setReservationId(null);
  router.push({ name: 'ReservationsNew' });
};

onMounted(async () => {
  await fetchHotels();
  await fetchUser();
  if (logged_user.value && logged_user.value[0] && logged_user.value[0].permissions) {
    const permissions = logged_user.value[0].permissions;
    isAdmin.value = !!(permissions.manage_db || permissions.manage_users);
    isClientEditor.value = !!permissions.manage_clients;
    isReporting.value = !!permissions.view_reports;
  }
  await fetchMyHoldReservations();
  // Initial menu items update
});

watch(
  selectedHotelId,
  (newVal) => {
    if (newVal) {
      // console.log(`Hotel ID ${newVal} is being provided by SideMenu.`);
    }
  },
  { immediate: true }
);

const toggleSidebar = () => {
  emit('toggle');
};

const handleLogout = () => {
  localStorage.removeItem('authToken');
  router.push('/login');
};
</script>

<style scoped>
.no-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.no-scroll::-webkit-scrollbar {
  display: none;
}

.pi {
  line-height: inherit;
}
</style>