<template>
  <div class="p-2">
    <Card>
      <template #title v-if="!isLoadingPermissions && !canCreateReservations">アクセスエラー</template>
      <template #content>
        <div v-if="isLoadingPermissions">
          <p>権限を確認中...</p>
        </div>
        <div v-else-if="canCreateReservations">
          <div class="flex items-center justify-between mb-2">
            <div class="justify-start">
              <span class="font-bold text-xl">新規予約</span>
            </div>
            <div class="flex items-center">
              <Button
                label="順番待ち登録"
                icon="pi pi-users"
                class="p-button-warning mr-2"
                @click="openWaitlistDialog"
              />
              <span class="mr-2">最適化モード</span>
              <ToggleButton v-model="showMinimal" onLabel="オン" offLabel="オフ" size="small" class="min-w-16" />
            </div>
          </div>
          <ReservationsNewMinimal v-if="showMinimal" ref="reservationsNewMinimalRef" />
          <ReservationsNewCombo v-else ref="reservationsNewComboRef" />
        </div>
        <div v-else>
          <p class="text-red-500 font-bold">予約作成の権限がありません。</p>
          <p>管理者に連絡して権限をリクエストしてください。</p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
  // Vue
  import { ref, computed, onMounted } from 'vue';
  import ReservationsNewMinimal from '@/pages/MainPage/ReservationsNew/components/ReservationsNewMinimal.vue';
  import ReservationsNewCombo from '@/pages/MainPage/ReservationsNew/components/ReservationsNewCombo.vue';

  // Stores
  import { useUserStore } from '@/composables/useUserStore';

  // Primevue
  import { Card, ToggleButton, Button } from 'primevue';

  const { logged_user, fetchUser } = useUserStore();
  const isLoadingPermissions = ref(true);

  const canCreateReservations = computed(() => {
    if (isLoadingPermissions.value) {
      return false; // Don't allow access while loading
    }
    return logged_user.value && logged_user.value.length > 0 && logged_user.value[0]?.permissions?.crud_ok === true;
  });

  onMounted(async () => {
    await fetchUser();
    isLoadingPermissions.value = false;
  });

  const showMinimal = ref(false);
  const reservationsNewComboRef = ref(null);
  const reservationsNewMinimalRef = ref(null);

  const openWaitlistDialog = () => {
    if (showMinimal.value) {
      if (reservationsNewMinimalRef.value) {
        reservationsNewMinimalRef.value.openWaitlistDialogDirect();
      }
    } else if (reservationsNewComboRef.value) {
      reservationsNewComboRef.value.openWaitlistDialogDirect();
    }
  };

</script>