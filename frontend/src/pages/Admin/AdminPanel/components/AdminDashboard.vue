<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">アドミンダッシュボード</h2>
        <!-- Grid layout for stat cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg flex flex-col shadow dark:shadow-gray-900/50">
                <div class="grow min-h-[3rem]">
                    <h3 class="text-md font-semibold text-blue-800 dark:text-blue-300">ログイン中ユーザー</h3>
                </div>
                <div class="mt-auto">
                    <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">{{ activeUsers }}</p>
                </div>
            </div>
            <div class="bg-green-50 dark:bg-green-900/20 p-5 rounded-lg flex flex-col shadow dark:shadow-gray-900/50">
                <div class="grow min-h-[3rem]">
                    <h3 class="text-md font-semibold text-green-800 dark:text-green-300">ホテル</h3>
                </div>
                <div class="mt-auto">
                    <p class="text-3xl font-bold text-green-600 dark:text-green-400">{{ hotelCount }}</p>
                </div>
            </div>
            <div class="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-lg flex flex-col shadow dark:shadow-gray-900/50">
                <div class="grow min-h-[3rem]">
                    <h3 class="text-md font-semibold text-purple-800 dark:text-purple-300">本日の予約</h3>
                </div>
                <div class="mt-auto">
                    <p class="text-3xl font-bold text-purple-600 dark:text-purple-400">{{
                        reservationsTodayCount }}
                    </p>
                    <p v-if="reservationsTodayValue > 0" class="text-sm text-purple-500 dark:text-purple-400">
                        ¥{{ reservationsTodayValue.toLocaleString() }}
                    </p>
                </div>
            </div>
            <div class="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-lg flex flex-col shadow dark:shadow-gray-900/50">
                <div class="grow min-h-[3rem]">
                    <h3 class="text-md font-semibold text-orange-800 dark:text-orange-300">平均リードタイム</h3>
                </div>
                <div class="mt-auto">
                    <p class="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {{ averageLeadTimeDays !== null ? averageLeadTimeDays.toFixed(1) + ' 日' : 'N/A' }}
                    </p>
                    <p v-if="averageLeadTimeDays !== null" class="text-sm text-orange-500 dark:text-orange-400">
                        本日の予約</p>
                </div>
            </div>
            <div class="bg-red-50 dark:bg-red-900/20 p-5 rounded-lg flex flex-col shadow dark:shadow-gray-900/50">
                <div class="grow min-h-[3rem]">
                    <h3 class="text-md font-semibold text-red-800 dark:text-red-300">順番待ち</h3>
                </div>
                <div class="mt-auto">
                    <p class="text-3xl font-bold text-red-600 dark:text-red-400">{{ waitlistCount }}</p>
                    <p class="text-sm text-red-500 dark:text-red-400">待機中</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useHotelStore } from '@/composables/useHotelStore';
const { hotels, fetchHotels } = useHotelStore();
import { useMetricsStore } from '@/composables/useMetricsStore';
const { reservationsToday, averageBookingLeadTime, waitlistEntriesToday, fetchReservationsToday, fetchBookingLeadTime, fetchWaitlistEntriesToday } = useMetricsStore();

const hotelCount = ref(0);
const activeUsers = ref(0);

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const todayDateString = `${year}-${month}-${day}`;
const reservationsTodayCount = ref(0);
const reservationsTodayValue = ref(0);

const averageLeadTimeDays = ref(0);
const waitlistCount = ref(0);

const fetchActiveUsers = async () => {
    try {
        const response = await fetch('/api/auth/active-users');
        if (!response.ok) {
            throw new Error(`HTTPエラー！ステータス: ${response.status}`);
        }
        const data = await response.json();
        activeUsers.value = data.activeUsers;
    } catch (err) {
        console.error('アクティブユーザーの取得に失敗しました:', err);
    }
};

let activeUsersInterval = null;

onMounted(async () => {
    await fetchHotels();

    hotelCount.value = hotels.value?.length || 0;

    fetchActiveUsers();
    activeUsersInterval = setInterval(fetchActiveUsers, 30000);

    let accumulatedReservationsCount = 0;
    let accumulatedReservationsValue = 0;
    let accumulatedWeightedLeadTime = 0;
    let accumulatedTotalNights = 0;

    if (hotels.value && Array.isArray(hotels.value)) {
        for (const hotel of hotels.value) {
            if (hotel && typeof hotel.id !== 'undefined') {
                try {
                    await fetchReservationsToday(hotel.id, todayDateString);
                    if (reservationsToday.value) {
                        accumulatedReservationsCount += Number(reservationsToday.value.reservationsCount) || 0;
                        accumulatedReservationsValue += Number(reservationsToday.value.reservationsValue) || 0;
                    } else {
                        console.warn(`ホテル ${hotel.id} の予約データが見つかりませんでした。`);
                    }

                    await fetchBookingLeadTime(hotel.id, 0, todayDateString);
                    if (averageBookingLeadTime.value) {
                        const leadTime = Number(averageBookingLeadTime.value.average_lead_time) || 0;
                        const nights = Number(averageBookingLeadTime.value.total_nights) || 0;

                        if (nights > 0) {
                            accumulatedWeightedLeadTime += leadTime * nights;
                            accumulatedTotalNights += nights;
                        }
                    } else {
                        console.warn(`ホテル ${hotel.id} の予約リードタイムデータが見つかりませんでした。`);
                    }

                    await fetchWaitlistEntriesToday(hotel.id, todayDateString);
                    if (waitlistEntriesToday.value) {
                        waitlistCount.value += Number(waitlistEntriesToday.value.waitlistCount) || 0;
                    } else {
                        console.warn(`ホテル ${hotel.id} のウェイトリストデータが見つかりませんでした。`);
                    }
                } catch (error) {
                    console.error(`ホテル ${hotel.id} の予約取得エラー:`, error);
                }
            } else {
                console.warn("IDがないためホテルをスキップします:", hotel);
            }
        }
    } else {
        console.warn("hotels.valueが配列ではないか、未定義です。予約を処理できません。");
    }

    reservationsTodayCount.value = accumulatedReservationsCount;
    reservationsTodayValue.value = accumulatedReservationsValue;

    averageLeadTimeDays.value = accumulatedTotalNights > 0 ? accumulatedWeightedLeadTime / accumulatedTotalNights : 0;
});

onUnmounted(() => {
    if (activeUsersInterval) {
        clearInterval(activeUsersInterval);
    }
});
</script>

<style scoped>
/* Any specific styles for the dashboard can go here */
</style>
