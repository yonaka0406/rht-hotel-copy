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
                <span>{{ userGreeting }}</span>
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
                <button @click="goToEditReservationPage(reservation.reservation_id)">
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
    import { ref, computed, watch, onMounted } from 'vue';
    import { useRouter } from 'vue-router';
    import { useUserStore } from '@/composables/useUserStore';
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
            const { logged_user, fetchUser } = useUserStore();
            const { hotels, setHotelId, selectedHotelId } = useHotelStore();
            const { holdReservations, fetchMyHoldReservations, getReservationHotelId, setReservationId } = useReservationStore();
            const showDrawer = ref(false);
            const userMessage = ref('');

            const userGreeting = computed(() => {
                const now = new Date();
                const hour = now.getHours();

                if (hour >= 5 && hour < 10) {
                    userMessage.value = 'おはようございます、' + logged_user.value[0]?.name;
                    // Good morning (5:00 AM - 9:59 AM)
                } else if (hour >= 10 && hour < 17) {
                    userMessage.value = 'こんにちは、' + logged_user.value[0]?.name;
                    // Good afternoon (10:00 AM - 4:59 PM)
                } else {
                    userMessage.value = 'こんばんは、' + logged_user.value[0]?.name;
                    // Good evening (5:00 PM - 4:59 AM)
                }
                
                return userMessage;
            });

            // Handle notification click
            const goToEditReservationPage = async (reservation_id) => {                
                await setReservationId(reservation_id);
                const hotel_id = await getReservationHotelId(reservation_id);
                setHotelId(hotel_id);
                
                showDrawer.value = false;

                router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });                          
            };

            onMounted( async () => {
                await fetchMyHoldReservations();                
                //console.log('holdReservations:',holdReservations.value);
                // Already called in SideMenu
                //fetchHotels(); 
                await fetchUser();
                //console.log('Logged user:',logged_user.value);                
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
                logged_user,             
                hotels,
                selectedHotelId,
                holdReservations,                
                showDrawer,       
                userGreeting,         
                goToEditReservationPage,
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