<template>
    <Toolbar class="bg-gray-100 border-b border-gray-300 shadow-md">
        <!-- Left Section -->
        <template #start>
            <div class="flex items-center space-x-4">                
                <!-- Logo -->
                <img src="@/assets/vue.svg" alt="Hotel PMS" class="h-8" />
                <!-- Title -->
                <h1 class="text-lg font-semibold text-gray-700">RHT Hotel PMS</h1>
            </div>
        </template>
        <!-- Right Section -->
        <template #end>
            <div class="flex items-center space-x-4">
                <!-- Notifications Icon -->                
                <OverlayBadge :value="holdReservations.length" class="mr-2">
                    <button class="p-button p-button-text" aria-label="通知" @click="showDrawer = true">
                        <i class="pi pi-bell" style="font-size:larger" />
                    </button>
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
                <button @click="goToNewReservationPage(reservation.reservation_id)">
                    {{ reservation.hotel_name }}<p>保留中予約を完成させてください: </p>
                    {{ reservation.client_name }} @ {{ reservation.check_in }}
                </button>
                <Divider />
            </li>
        </ul>
        <p v-else class="text-center text-gray-500">通知はありません。</p>
    </Drawer>
</template>

<script>
    import { ref, onMounted, watch } from 'vue';
    import { useRouter } from 'vue-router';
    import { useHotelStore } from '@/composables/useHotelStore';
    import { useReservationStore } from '@/composables/useReservationStore';
    import { Toolbar, OverlayBadge, Select, Drawer, Divider } from 'primevue';
    export default {
        components: {
            Toolbar,
            OverlayBadge,
            Select,
            Drawer,
            Divider,
        },
        setup() {     
            const router = useRouter();       
            const { hotels, setHotelId, selectedHotelId } = useHotelStore();
            const { holdReservations, fetchMyHoldReservations, getReservationHotelId, setReservationId } = useReservationStore();
            const showDrawer = ref(false);

            // Handle notification click (navigate to New Reservation page)            
            const goToNewReservationPage = async (reservation_id) => {                
                await setReservationId(reservation_id);

                const hotel_id = await getReservationHotelId(reservation_id);
                setHotelId(hotel_id);
                
                router.push({ name: 'ReservationsNew' });                
                showDrawer.value = false; // Close the notifications drawer
            };

            onMounted( async () => {
                await fetchMyHoldReservations();
                //console.log('holdReservations:',holdReservations.value);
                // Already called in SideMenu
                //fetchHotels(); 
            });
            
            watch(selectedHotelId,
                (newVal, oldVal) => {                    
                    if (newVal) {
                        //console.log(`Hotel ID ${newVal} is being provided by TopMenu.`);
                    }
                },
                { immediate: true } // This ensures the watcher runs on initialization
            );

            return{                
                hotels,
                selectedHotelId,
                holdReservations,                
                showDrawer,                
                goToNewReservationPage,
            };
        },
        methods: {
            
        },
    };
</script>
<style scoped>
    button {
        background-color: transparent;
    }
</style>
  