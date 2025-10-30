<template>
    <Toolbar class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 shadow-md">
        <!-- Left Section -->
        <template #start>
            <div class="flex items-center gap-4">                
                <span class="ml-4 dark:text-white" v-html="userGreeting"></span>
            </div>
        </template>
        <!-- Right Section -->
        <template #end>
            <div class="flex items-center gap-4">

                <!-- Search Icon -->
                <Button 
                    class="p-button p-button-text dark:text-white" 
                    aria-label="予約検索" 
                    @click="openGlobalSearch"
                    v-tooltip.bottom="{ value: '予約検索 (Ctrl+K)', class: 'small-tooltip' }"
                >
                    <i class="pi pi-search" style="font-size:larger" />
                </Button>

                <!-- Waitlist Icon (New) - Only show when 1 or more entries -->
                <OverlayBadge v-if="waitlistBadgeCount >= 1" :value="waitlistBadgeCount" class="mr-2">
                    <Button class="p-button p-button-text dark:text-white" aria-label="順番待ちリスト" @click="openWaitlistModal">
                        <i class="pi pi-calendar-clock" style="font-size:larger" />
                    </Button>
                </OverlayBadge>

                <!-- OTA Notifications Icon -->
                <template v-if="otaNotificationsBadgeCount > 0">
                    <OverlayBadge :value="otaNotificationsBadgeCount" class="mr-2" severity="danger">
                        <Button class="p-button p-button-text dark:text-white" aria-label="OTA通知" @click="showOtaDrawer = true">
                            <i class="pi pi-globe animate-pulse-red" style="font-size:larger" />
                        </Button>
                    </OverlayBadge>
                </template>
                
                <!-- Notifications Icon -->                
                <OverlayBadge :value="notificationsBadgeCount" class="mr-2" :severity="notificationSeverity">
                    <Button class="p-button p-button-text dark:text-white" aria-label="通知" :severity="notificationSeverity" @click="showDrawer = true">
                        <i class="pi pi-bell" :class="bellAnimationClass" style="font-size:larger" />
                    </Button>
                </OverlayBadge>
                <!-- Hotel Dropdown -->
                <Select
                    name="hotel"
                    v-model="selectedHotelId"
                    :options="hotels"
                    optionLabel="name" 
                    optionValue="id"
                    :virtualScrollerOptions="{ itemSize: 38 }"
                    class="w-48 dark:bg-gray-700 dark:text-white"
                    placeholder="ホテル選択"
                    filter
                />
                <!-- Help Icon -->
                <Button 
                    class="p-button p-button-text dark:text-white" 
                    aria-label="ヘルプ" 
                    @click="goToAboutPage"
                    v-tooltip.bottom="{ value: 'システムヘルプ', class: 'small-tooltip' }"
                >
                    <i class="pi pi-question-circle" style="font-size:1rem" />
                </Button>
            </div>
        </template>
    </Toolbar>
    
    <!-- Drawer for OTA Notifications -->
    <OtaNotificationsDrawer
        v-model:visible="showOtaDrawer"
        :failed-ota-reservations="failedOtaReservations"
        @go-to-edit-reservation="goToEditReservationPage"
    />

    <!-- Drawer for Notifications -->
    <NotificationsDrawer
        v-model:visible="showDrawer"
        :hold-reservations="holdReservations"
        :temp-blocked-reservations="tempBlockedReservations"
        :notification-severity="notificationSeverity"
        @go-to-edit-reservation="goToEditReservationPage"
    />

    <!-- Waitlist Display Modal -->
    <WaitlistDisplayModal
        :visible="isWaitlistModalVisible"
        @update:visible="isWaitlistModalVisible = $event"
    />
    
    <!-- Global Search Modal -->
    <GlobalSearchModal
        :visible="isGlobalSearchVisible"
        @update:visible="isGlobalSearchVisible = $event"
        @select-reservation="onSelectReservation"
    />
</template>

<script setup>
    // Vue
    import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';    
    import { useRouter } from 'vue-router';
    const router = useRouter();

    // Stores
    import { useUserStore } from '@/composables/useUserStore';
    const { logged_user } = useUserStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, setHotelId, selectedHotelId, hotelBlockedRooms, fetchBlockedRooms, fetchHotels } = useHotelStore();
    import { useReservationStore } from '@/composables/useReservationStore';
    const { holdReservations, failedOtaReservations, fetchFailedOtaReservations, setReservationId } = useReservationStore();
    import { useWaitlistStore } from '@/composables/useWaitlistStore'; // Import waitlist store

    // Components (for Waitlist Modal and Global Search)
    import WaitlistDisplayModal from './WaitlistDisplayModal.vue';
    import GlobalSearchModal from './GlobalSearchModal.vue';
    import NotificationsDrawer from './NotificationsDrawer.vue';
    import OtaNotificationsDrawer from './OtaNotificationsDrawer.vue';

    // Primevue
    import { Toolbar, OverlayBadge, Select, Button } from 'primevue';

    // --- Store Instances ---
    const waitlistStore = useWaitlistStore();

    // --- Reactive State ---
    const showDrawer = ref(false);
    const showOtaDrawer = ref(false);
    // const waitlistBadgeCount = ref(0); // Will be replaced by a computed property
    const isWaitlistModalVisible = ref(false); // Controls visibility of the waitlist modal
    const isGlobalSearchVisible = ref(false); // Controls visibility of the global search modal

    // --- Computed Properties ---
    const waitlistBadgeCount = computed(() => {
        // UX Refinement: Definition of "actionable" waitlist items.
        // Currently, this counts entries with status 'waiting'.
        // This definition should be confirmed with stakeholders. A more complex definition
        // (e.g., 'waiting' AND matching room available) might require a dedicated backend count
        // for efficiency and to encapsulate business logic.
        return waitlistStore.entries.value.filter(entry => entry.status === 'waiting').length;
    });

    const hasCrudAccess = computed(() => {
        return logged_user.value && logged_user.value.length > 0 && logged_user.value[0]?.permissions?.crud_ok === true;
    });

    const userGreeting = computed(() => {
        const now = new Date();
        const hour = now.getHours();
        // Robustly get user name with a fallback
        const userName = (logged_user.value && logged_user.value.length > 0 && logged_user.value[0]?.name)
                        ? logged_user.value[0].name
                        : 'User'; // Default name if not available or structure is different

        let greetingText;
        if (hour >= 5 && hour < 10) {
            greetingText = `おはようございます、${userName}`; // Good morning (5:00 AM - 9:59 AM)
        } else if (hour >= 10 && hour < 17) {
            greetingText = `こんにちは、${userName}`; // Good afternoon (10:00 AM - 4:59 PM)
        } else {
            greetingText = `こんばんは、${userName}`; // Good evening (5:00 PM - 4:59 AM)
        }

        if (!hasCrudAccess.value) {
            greetingText += ` <small style="color: red; margin-left: 8px;">閲覧者</small>`;
        }
        return greetingText;
    });

    const otaNotificationsBadgeCount = computed(() => {
        return Array.isArray(failedOtaReservations.value) ? failedOtaReservations.value.length : 0;
    });

    const notificationsBadgeCount = computed(() => {
        const holdCount = Array.isArray(holdReservations.value) ? holdReservations.value.length : 0;
        const tempBlockedCount = Array.isArray(tempBlockedReservations.value) ? tempBlockedReservations.value.length : 0;
        return holdCount + tempBlockedCount;
    });

    // Computed property for dynamic severity string based on notification count    
    const notificationSeverity = computed(() => {
      const count = holdReservations.value.length;
      if (count > 5) { // More than 5 notifications
        return 'danger';
      } else if (count > 0) { // 1 to 5 notifications
        return 'warn';
      }      
      return null; 
    });

    // Computed property for bell animation class
    const bellAnimationClass = computed(() => {
      return holdReservations.value.length > 0 ? 'animate-bell-icon' : '';
    });

    const tempBlockedReservations = computed(() => {
        // console.log('[TopMenu] hotelBlockedRooms:', hotelBlockedRooms.value);
        if (!hotelBlockedRooms.value || !logged_user.value || !logged_user.value[0] || !logged_user.value[0].id) {
            return [];
        }
        const filtered = hotelBlockedRooms.value.filter(room => 
            room.reservation_client_id === '22222222-2222-2222-2222-222222222222' && 
            room.created_by === logged_user.value[0].id
        );
        // console.log('[TopMenu] filtered hotelBlockedRooms:', filtered);
        return filtered;
    });

    // --- Methods ---
    const openWaitlistModal = () => {
        isWaitlistModalVisible.value = true;
    };

    const openGlobalSearch = () => {
        // console.debug('[TopMenu] openGlobalSearch called');
        isGlobalSearchVisible.value = true;
    };

    const onSelectReservation = async (reservation) => {
        // Set the hotel context if needed
        if (reservation.hotel_id) {
            await setHotelId(reservation.hotel_id);
        }
        
        // Set the reservation context
        if (reservation.reservation_id) {
            await setReservationId(reservation.reservation_id);
        }
    };

    const goToEditReservationPage = async (hotel_id, reservation_id) => {
        await setHotelId(hotel_id); // Set the hotel context in the store
        await setReservationId(reservation_id); // Set the reservation context in the store

        showDrawer.value = false; // Close the notification drawer
        showOtaDrawer.value = false; // Close the OTA notification drawer

        // Navigate to the reservation editing page
        router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });
    };

    const goToAboutPage = () => {
        router.push({ name: 'About' });
    };

    // --- Lifecycle Hooks ---
    onMounted(async () => {
        // console.group('[TopMenu] Component Mounted');
        // console.log('[TopMenu] onMounted: Initial selectedHotelId.value:', selectedHotelId.value);
        // console.log('[TopMenu] onMounted: hotels.value.length:', hotels.value.length);
        
        // Ensure hotels are loaded
        if (hotels.value.length === 0) {
            // console.log('[TopMenu] onMounted: Fetching hotels...');
            await fetchHotels();
            // console.log('[TopMenu] onMounted: Hotels fetched. hotels.value.length:', hotels.value.length);
        }
        
        // If no hotel is selected but we have hotels, select the first one
        if (!selectedHotelId.value && hotels.value.length > 0) {
            // console.log('[TopMenu] onMounted: No hotel selected, selecting first available hotel');
            setHotelId(hotels.value[0].id);
        }
        
        // console.log('[TopMenu] onMounted: Final selectedHotelId.value:', selectedHotelId.value);
        // console.log('[TopMenu] onMounted: Available hotels:', JSON.parse(JSON.stringify(hotels.value)));
        // console.log('[TopMenu] onMounted: Current route:', router.currentRoute.value);
        console.groupEnd();
        
        try {
            // console.log('[TopMenu] onMounted: Fetching failed OTA reservations...');
            await fetchFailedOtaReservations();
        } catch (error) {
            console.error('[TopMenu] onMounted: Error in mounted hook:', error);
        }
        
        // Register global keyboard shortcut for search
        document.addEventListener('keydown', handleGlobalKeydown);
    });
    
    // Clean up event listener when component is unmounted
    onBeforeUnmount(() => {
        document.removeEventListener('keydown', handleGlobalKeydown);
    });
    
    // Handle global keyboard shortcuts
    const handleGlobalKeydown = (event) => {
        // Ctrl+K or Cmd+K to open global search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            openGlobalSearch();
        }
    };

    // --- Watchers ---
    watch(selectedHotelId,
        async (newHotelId, oldHotelId) => {
            // console.group(`[TopMenu] Hotel Selection Change Watcher`);
            // console.log('[TopMenu] Watcher: Previous Hotel ID:', oldHotelId);
            // console.log('[TopMenu] Watcher: New Hotel ID:', newHotelId);
            
            // Always update the hotel ID in the store when it changes
            if (newHotelId !== null && newHotelId !== undefined) {
                // console.log('[TopMenu] Watcher: Updating selected hotel in store and localStorage');
                setHotelId(newHotelId);
            }
            
            if (newHotelId && newHotelId !== oldHotelId) {
                try {
                    // console.log('[TopMenu] Watcher: Fetching waitlist entries...');
                    await waitlistStore.fetchWaitlistEntries(newHotelId, { 
                        filters: { status: ['waiting', 'notified'] } 
                    });
                    // console.log('[TopMenu] Watcher: Waitlist entries fetched successfully');
                    
                    // console.log('[TopMenu] Watcher: Fetching blocked rooms...');
                    await fetchBlockedRooms(newHotelId);
                    // console.log('[TopMenu] Watcher: Blocked rooms fetched successfully');
                } catch (error) {
                    console.error('Error during hotel data fetch:', {
                        message: error.message,
                        endpoint: error.config?.url,
                        status: error.response?.status,
                        statusText: error.response?.statusText
                    });
                }
            } else if (!newHotelId && hotels.value.length > 0) {
                // console.log('[TopMenu] Watcher: No hotel selected - selecting first available hotel');
                setHotelId(hotels.value[0].id);
            } else if (!newHotelId) {
                // console.log('[TopMenu] Watcher: No hotel selected - clearing waitlist entries');
                waitlistStore.entries.value = [];
            }
            
            console.groupEnd();
        },
        { immediate: true }
    );
    
    // Watch for changes to the hotels array
    watch(() => hotels.value, (newHotels) => {
        // console.log('[TopMenu] Watcher: hotels.value changed. newHotels.length:', newHotels.length, 'selectedHotelId.value:', selectedHotelId.value);
        if (newHotels.length > 0 && !selectedHotelId.value) {
            // If we have hotels but no selected hotel, select the first one
            // console.log('[TopMenu] Watcher: Auto-selecting first hotel from list');
            setHotelId(newHotels[0].id);
        }
    });

</script>
<style scoped>
    button {
        background-color: transparent;
    }
    .m-2 button {
        display: block;
        width: 100%;    
        padding: 8px;
        border-radius: 4px;
    }
    .m-2 button:hover {
        background-color: rgba(0,0,0,0.05);
    }
    
    /* Dark mode button hover */
    :global(.dark) .m-2 button:hover {
        background-color: rgba(255,255,255,0.1);
    }

    /* Keyframes for bell animation */
    @keyframes gentle-bell-shake {
        0%, 100% { transform: rotate(0); }
        20%, 60% { transform: rotate(7deg); } /* Reduced rotation for subtlety */
        40%, 80% { transform: rotate(-7deg); } /* Reduced rotation for subtlety */
    }

    /* Class to apply the animation to the bell icon */
    .animate-bell-icon {
        display: inline-block; /* Important for transforms to work correctly on inline elements like <i> */
        transform-origin: top center; /* Bell swings from its top center */
        animation: gentle-bell-shake 2s ease-in-out infinite; /* Animation properties: name, duration, timing function, iteration count */
    }

    @keyframes pulse-red {
      0%, 100% {
        transform: scale(1);
        text-shadow: 0 0 0 rgba(239, 68, 68, 0.7);
      }
      50% {
        transform: scale(1.1);
        text-shadow: 0 0 10px rgba(239, 68, 68, 1);
      }
    }
    .animate-pulse-red {
      animation: pulse-red 1.5s infinite;
      color: #ef4444; /* red-500 */
    }
    .p-toolbar-end .p-button {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .small-tooltip {
        font-size: 0.75rem !important;
        padding: 2px 6px !important;
    }
</style>
