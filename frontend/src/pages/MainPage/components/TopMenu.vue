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

                <!-- Waitlist Icon (New) - Only show when 1 or more entries -->
                <OverlayBadge v-if="waitlistBadgeCount >= 1" :value="waitlistBadgeCount" class="mr-2">
                    <Button class="p-button p-button-text dark:text-white" aria-label="順番待ちリスト" @click="openWaitlistModal">
                        <i class="pi pi-calendar-clock" style="font-size:larger" />
                    </Button>
                </OverlayBadge>
                
                <!-- Help Icon -->
                <Button 
                    class="p-button p-button-text dark:text-white mr-2" 
                    aria-label="ヘルプ" 
                    @click="goToAboutPage"
                    v-tooltip.bottom="'システムヘルプ'"
                >
                    <i class="pi pi-question-circle" style="font-size:larger" />
                </Button>

                <!-- Notifications Icon -->                
                <OverlayBadge :value="holdReservations.length" class="mr-2" :severity="notificationSeverity">
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
            </div>
        </template>
    </Toolbar>
    
    <!-- Drawer for Notifications -->
    <Drawer v-model:visible="showDrawer" position="right" :style="{ width: '300px' }" header="通知" class="dark:bg-gray-800 dark:text-white">
        <ul v-if="holdReservations.length">
            <li v-for="(reservation, index) in holdReservations" :key="index" class="m-2">
                <button @click="goToEditReservationPage(reservation.hotel_id, reservation.reservation_id)" class="dark:text-white dark:hover:bg-gray-700">
                    {{ reservation.hotel_name }}<span>保留中予約を完成させてください: </span><br/>
                    {{ reservation.client_name }} @ {{ reservation.check_in }}
                </button>
                <Divider class="dark:border-gray-600" />
            </li>
        </ul>
        <p v-else class="text-center text-gray-500 dark:text-gray-400">通知はありません。</p>
    </Drawer>

    <!-- Waitlist Display Modal -->
    <WaitlistDisplayModal
        :visible="isWaitlistModalVisible"
        @update:visible="isWaitlistModalVisible = $event"
    />
</template>

<script setup>
    // Vue
    import { ref, computed, watch, onMounted } from 'vue';    
    import { useRouter } from 'vue-router';
    const router = useRouter();

    // Stores
    import { useUserStore } from '@/composables/useUserStore';
    const { logged_user, fetchUser } = useUserStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, setHotelId, selectedHotelId } = useHotelStore(); // selectedHotelId is a ref
    import { useReservationStore } from '@/composables/useReservationStore';
    const { holdReservations, fetchMyHoldReservations, setReservationId } = useReservationStore();
    import { useWaitlistStore } from '@/composables/useWaitlistStore'; // Import waitlist store

    // Components (for Waitlist Modal)
    import WaitlistDisplayModal from './WaitlistDisplayModal.vue';

    // Primevue
    import { Toolbar, OverlayBadge, Select, Drawer, Divider, Button } from 'primevue';

    // --- Store Instances ---
    const waitlistStore = useWaitlistStore();

    // --- Reactive State ---
    const showDrawer = ref(false);
    // const waitlistBadgeCount = ref(0); // Will be replaced by a computed property
    const isWaitlistModalVisible = ref(false); // Controls visibility of the waitlist modal

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

    // --- Methods ---
    const openWaitlistModal = () => {
        isWaitlistModalVisible.value = true;
    };

    const goToEditReservationPage = async (hotel_id, reservation_id) => {
        await setHotelId(hotel_id); // Set the hotel context in the store
        await setReservationId(reservation_id); // Set the reservation context in the store

        showDrawer.value = false; // Close the notification drawer

        // Navigate to the reservation editing page
        router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });
    };

    const goToAboutPage = () => {
        router.push({ name: 'About' });
    };

    // --- Lifecycle Hooks ---
    onMounted(async () => {
        // Already called in SideMenu 
        // await fetchUser();
        // await fetchMyHoldReservations();
    });

    // --- Watchers ---
    watch(selectedHotelId,
        (newHotelId, oldHotelId) => {
            if (newHotelId && newHotelId !== oldHotelId) {
                // Fetch waitlist entries for the new hotel to update the badge count.
                // Only fetch entries with status 'waiting' and 'notified'.
                waitlistStore.fetchWaitlistEntries(newHotelId, { filters: { status: ['waiting', 'notified'] } });
            } else if (!newHotelId) {
                // Clear entries if no hotel is selected
                waitlistStore.entries.value = [];
            }
        },
        { immediate: true }
    );

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
</style>