<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Loading State -->
      <div v-if="loading" class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">確認中...</p>
      </div>

      <!-- Valid Token - Show Reservation Details -->
      <div v-else-if="!tokenExpired && reservationDetails" class="bg-white shadow-lg rounded-lg p-8">
        <div class="text-center mb-6">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 class="mt-4 text-2xl font-bold text-gray-900">ご希望のお部屋に空きが出ました！</h2>
          <p class="mt-2 text-gray-600">以下の詳細でご予約いただけます</p>
        </div>

        <!-- Hotel Information -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">ホテル情報</h3>
          <p class="text-gray-700">{{ reservationDetails.hotelName }}</p>
        </div>

        <!-- Reservation Details -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">予約詳細</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">チェックイン:</span>
              <span class="font-medium">{{ formatDate(reservationDetails.checkInDate) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">チェックアウト:</span>
              <span class="font-medium">{{ formatDate(reservationDetails.checkOutDate) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">宿泊人数:</span>
              <span class="font-medium">{{ reservationDetails.numberOfGuests }}名</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">希望部屋数:</span>
              <span class="font-medium">{{ reservationDetails.numberOfRooms }}室</span>
            </div>
            <div v-if="reservationDetails.roomTypeName" class="flex justify-between">
              <span class="text-gray-600">希望部屋タイプ:</span>
              <span class="font-medium">{{ reservationDetails.roomTypeName }}</span>
            </div>
          </div>
        </div>

        <!-- Client Information -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">お客様情報</h3>
          <p class="text-gray-700">{{ reservationDetails.clientName }}</p>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <button
            @click="confirmReservation"
            :disabled="confirming"
            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="confirming" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            {{ confirming ? '確認中...' : '予約を確認する' }}
          </button>
          
          <button
            @click="cancelReservation"
            :disabled="cancelling"
            class="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="cancelling" class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></span>
            {{ cancelling ? 'キャンセル中...' : 'キャンセル' }}
          </button>
        </div>

        <!-- Expiry Notice -->
        <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p class="text-sm text-yellow-800">
            ※このリンクは {{ formatDate(reservationDetails.expiryDate) }} まで有効です
          </p>
        </div>
      </div>

      <!-- Expired or Invalid Token -->
      <div v-else class="bg-white shadow-lg rounded-lg p-8">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 class="mt-4 text-2xl font-bold text-gray-900">リンクが無効です</h2>
          <p class="mt-2 text-gray-600">
            この確認リンクは期限切れか無効です。<br>
            予約センターまでお問い合わせください。
          </p>
        </div>

        <!-- Contact Information -->
        <div class="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 class="text-sm font-medium text-gray-900 mb-2">お問い合わせ先</h3>
          <p class="text-sm text-gray-600">
            予約センター<br>
            電話: 03-XXXX-XXXX<br>
            メール: reservations@example.com
          </p>
        </div>

        <!-- Back to Home Button -->
        <div class="mt-6">
          <button
            @click="goToHome"
            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

// Reactive state
const loading = ref(true);
const tokenExpired = ref(false);
const confirming = ref(false);
const cancelling = ref(false);
const reservationDetails = ref(null);

// Get token from route params
const token = route.params.token;

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Validate token and fetch reservation details
const validateToken = async () => {
  try {
    const response = await fetch(`/api/waitlist/confirm/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      reservationDetails.value = {
        hotelName: data.hotelName,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        numberOfGuests: data.numberOfGuests,
        numberOfRooms: data.numberOfRooms,
        roomTypeName: data.roomTypeName,
        clientName: data.clientName,
        expiryDate: data.expiryDate,
        waitlistEntryId: data.waitlistEntryId
      };
      tokenExpired.value = false;
    } else {
      const errorData = await response.json();
      console.error('Token validation failed:', errorData);
      tokenExpired.value = true;
    }
  } catch (error) {
    console.error('Error validating token:', error);
    tokenExpired.value = true;
  } finally {
    loading.value = false;
  }
};

// Confirm the reservation
const confirmReservation = async () => {
  confirming.value = true;
  try {
    const response = await fetch(`/api/waitlist/confirm/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      // Redirect to reservation page with pre-filled data
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        // Fallback: redirect to main page
        router.push('/');
      }
    } else {
      const errorData = await response.json();
      alert(`予約の確認に失敗しました: ${errorData.error || 'エラーが発生しました'}`);
    }
  } catch (error) {
    console.error('Error confirming reservation:', error);
    alert('予約の確認中にエラーが発生しました');
  } finally {
    confirming.value = false;
  }
};

// Cancel the reservation
const cancelReservation = async () => {
  if (!confirm('この予約をキャンセルしますか？')) {
    return;
  }

  cancelling.value = true;
  try {
    const response = await fetch(`/api/waitlist/confirm/${token}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      alert('予約をキャンセルしました');
      router.push('/');
    } else {
      const errorData = await response.json();
      alert(`キャンセルに失敗しました: ${errorData.error || 'エラーが発生しました'}`);
    }
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    alert('キャンセル中にエラーが発生しました');
  } finally {
    cancelling.value = false;
  }
};

// Go to home page
const goToHome = () => {
  router.push('/');
};

// Initialize component
onMounted(() => {
  if (!token) {
    tokenExpired.value = true;
    loading.value = false;
    return;
  }
  
  validateToken();
});
</script>

<style scoped>
/* Additional custom styles if needed */
</style> 