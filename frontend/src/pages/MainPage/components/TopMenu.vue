<template>
    <Toolbar class="bg-gray-100 border-b border-gray-300 shadow-md">
        <!-- Left Section -->
        <template #start>
            <div class="flex items-center gap-4">                
                <span class="ml-4" v-html="userGreeting"></span>
            </div>
        </template>
        <!-- Right Section -->
        <template #end>
            <div class="flex items-center gap-4">
                
                <!-- Notifications Icon -->                
                <OverlayBadge :value="holdReservations.length" class="mr-2" :severity="notificationSeverity">
                    <Button class="p-button p-button-text" aria-label="通知" :severity="notificationSeverity" @click="showDrawer = true">
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
                    class="w-48"
                    placeholder="ホテル選択"
                    filter
                />
            </div>
        </template>
    </Toolbar>
    
    <!-- Drawer for Notifications -->
    <Drawer v-model:visible="showDrawer" position="right" :style="{ width: '300px' }" header="通知">
        <ul v-if="holdReservations.length">
            <li v-for="(reservation, index) in holdReservations" :key="index" class="m-2">
                <button @click="goToEditReservationPage(reservation.hotel_id, reservation.reservation_id)">
                    {{ reservation.hotel_name }}<span>保留中予約を完成させてください: </span><br/>
                    {{ reservation.client_name }} @ {{ reservation.check_in }}
                </button>
                <Divider />
            </li>
        </ul>
        <p v-else class="text-center text-gray-500">通知はありません。</p>
    </Drawer>
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
    const { hotels, setHotelId, selectedHotelId } = useHotelStore();
    import { useReservationStore } from '@/composables/useReservationStore';
    const { holdReservations, fetchMyHoldReservations, setReservationId } = useReservationStore();

    // Primevue
    import { Toolbar, OverlayBadge, Select, Drawer, Divider, Button } from 'primevue';

    // --- Reactive State ---
    const showDrawer = ref(false);

    // --- Computed Properties ---
    const isReadOnly = computed(() => {
        return logged_user.value && logged_user.value.length > 0 && logged_user.value[0]?.permissions?.crud_ok === false;
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

        if (isReadOnly.value) {
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
    const goToEditReservationPage = async (hotel_id, reservation_id) => {
        await setHotelId(hotel_id); // Set the hotel context in the store
        await setReservationId(reservation_id); // Set the reservation context in the store

        // console.log('TopMenu goToEditReservationPage:', hotel_id, reservation_id);

        showDrawer.value = false; // Close the notification drawer

        // Navigate to the reservation editing page
        router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });
    };

    // --- Lifecycle Hooks ---
    onMounted(async () => {
        // console.log('holdReservations onMounted:', holdReservations.value);
        // Already called in SideMenu 
        // await fetchUser();
        // await fetchMyHoldReservations();
        // console.log('Logged user onMounted:', logged_user.value);
    });

    // --- Watchers ---
    watch(selectedHotelId,
        (newVal, oldVal) => {
            if (newVal) {
                // console.log(`Hotel ID changed from ${oldVal} to ${newVal} via TopMenu selection.`);
            }
        },
        { immediate: true } // This ensures the watcher runs on component initialization with the initial value.
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