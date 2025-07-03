<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    header="順番待ちリスト"
    :style="{ width: '70vw', maxWidth: '900px' }"
    position="bottom"
    @hide="closeModal"
  >
    <DataTable :value="waitlistEntries" :loading="loading" responsiveLayout="scroll">
      <!-- UX Refinement: Consider making columns sortable. Add other relevant columns like 'Date Added' or 'Notes'. -->
      <!-- Make clientName a link to client profile if possible. -->
      <Column field="clientName" header="クライアント名" :sortable="true"></Column>
      <Column field="roomTypeName" header="希望部屋タイプ" :sortable="true"></Column>
      <Column field="requestedDates" header="希望日程"></Column>
      <Column field="status" header="ステータス" :sortable="true">
        <!-- UX Refinement: Display status with badges/colors for better visual distinction. -->
        <template #body="slotProps">
          <span>{{ slotProps.data.status }}</span>
        </template>
      </Column>
      <Column field="notes" header="メモ" :sortable="false"></Column>
      <Column header="アクション">
        <template #body="slotProps">
          <Button icon="pi pi-envelope" class="p-button-rounded p-button-text" @click="sendManualEmail(slotProps.data)" v-tooltip.top="'手動メール送信'" />
          <!-- Other actions can be added here e.g., View Details, Edit Entry -->
        </template>
      </Column>

      <template #empty>
        順番待ちリストに登録されている情報はありません。
      </template>
      <template #loading>
        順番待ち情報を読み込み中です...
      </template>
    </DataTable>

    <template #footer>
      <Button label="閉じる" icon="pi pi-times" @click="closeModal" class="p-button-text"/>
    </template>
  </Dialog>
</template>

<script setup>
import { defineProps, defineEmits, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useConfirm } from "primevue/useconfirm";
import { useWaitlistStore } from '@/composables/useWaitlistStore';
import { useHotelStore } from '@/composables/useHotelStore'; // For selectedHotelId

// Tooltip directive is globally registered in main.js, so no need to import here.

const confirm = useConfirm();
const { entries, loading, pagination, fetchWaitlistEntries, sendManualNotification } = useWaitlistStore();
const { selectedHotelId } = useHotelStore(); // This is a ref

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  }
});

const emit = defineEmits(['update:visible']);

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

// Fetch data when modal becomes visible and hotelId is available
watch(() => [props.visible, selectedHotelId.value], ([newVisible, hotelId]) => {
  if (newVisible && hotelId) {
    // TODO: Handle pagination options if needed
    fetchWaitlistEntries(hotelId);
  }
}, { immediate: true }); // immediate might try to fetch on load if visible is true initially

const closeModal = () => {
  isVisible.value = false;
};

const sendManualEmail = (entry) => {
  confirm.require({
    message: `「${entry.clientName || 'このクライアント'}」に手動で空室案内メールを送信しますか？この操作により、該当の順番待ちエントリーのステータスが「通知済み」に更新されます。`, // Do you want to manually send an availability notification email to "${entry.clientName || 'this client'}"? This will update the waitlist entry status to "notified".
    header: '手動メール送信の確認', // Manual Email Confirmation
    icon: 'pi pi-envelope',
    acceptLabel: 'はい、送信する', // Yes, send
    rejectLabel: 'いいえ、キャンセル', // No, cancel
    accept: async () => {
      if (!entry.id) {
        console.error('Entry ID is missing, cannot send manual email.');
        // UX Refinement: Show a user-facing toast error instead of just console.error
        // Example: toast.add({ severity: 'error', summary: 'Error', detail: 'Cannot send email: Entry ID is missing.', life: 3000 });
        return;
      }
      const result = await sendManualNotification(entry.id); // Use destructured function
      if (result && selectedHotelId.value) {
        // Refresh the list after successful action
        fetchWaitlistEntries(selectedHotelId.value);
        console.log('Manual email process completed for entry:', entry.id, 'Result:', result);
      }
    },
    reject: () => {
      // Optional: Show a toast message that the action was cancelled
    }
  });
};

// TODO: Fetch actual waitlist entries when the modal becomes visible,
// likely by calling a function from useWaitlistStore.
// This will be handled in a subsequent step.

</script>

<style scoped>
/* Custom styles for the modal if needed */
</style>
