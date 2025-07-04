<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    header="順番待ちリスト"
    :style="{ width: '70vw', maxWidth: '900px' }"
    position="bottom"
    @hide="closeModal"
  >
    <DataTable :value="entries" :loading="loading" responsiveLayout="scroll" size="small">
      <!-- UX Refinement: Consider making columns sortable. Add other relevant columns like 'Date Added' or 'Notes'. -->
      <!-- Make clientName a link to client profile if possible. -->
      <Column field="clientName" header="クライアント名" :sortable="true"></Column>
      <Column field="roomTypeName" header="希望部屋タイプ" :sortable="true"></Column>
      <Column field="requestedDates" header="希望日程"></Column>
      <Column field="number_of_guests" header="人数" :sortable="true"></Column>
      <Column field="number_of_rooms" header="部屋数" :sortable="true"></Column>
      <Column field="status" header="ステータス" :sortable="true">
        <template #body="slotProps">
          <Tag :value="getStatusLabel(slotProps.data.status)" :severity="getStatusTagSeverity(slotProps.data.status)" />
        </template>
      </Column>
      <Column field="notes" header="メモ" :sortable="false"></Column>
      <Column header="アクション">
        <template #body="slotProps">
          <SplitButton 
            :model="getActionItems(slotProps.data)" 
            size="small"
            :label="getMainActionLabel(slotProps.data)"
            :icon="getMainActionIcon(slotProps.data)"
            @click="handleMainAction(slotProps.data)"
          />
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
import { computed, watch, ref, h } from 'vue'; // defineProps and defineEmits are compiler macros
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import { useConfirm } from "primevue/useconfirm";
import { useWaitlistStore } from '@/composables/useWaitlistStore';
import { useHotelStore } from '@/composables/useHotelStore'; // For selectedHotelId
import Tag from 'primevue/tag';

// Tooltip directive is globally registered in main.js, so no need to import here.

const confirm = useConfirm();
const { entries, loading, pagination, fetchWaitlistEntries, sendManualNotification, cancelEntry } = useWaitlistStore();
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

// Status localization function
const getStatusLabel = (status) => {
  const statusLabels = {
    'waiting': '順番待ち',
    'notified': '通知済み',
    'confirmed': '確認済み',
    'expired': '期限切れ',
    'cancelled': 'キャンセル'
  };
  return statusLabels[status] || status;
};

// Helper functions for SplitButton actions
const getMainActionLabel = (entry) => {
  if (entry.communication_preference === 'email') {
    return 'メール送信';
  } else if (entry.communication_preference === 'phone') {
    return '電話番号表示';
  }
  return 'アクション';
};

const getMainActionIcon = (entry) => {
  if (entry.communication_preference === 'email') {
    return 'pi pi-envelope';
  } else if (entry.communication_preference === 'phone') {
    return 'pi pi-phone';
  }
  return 'pi pi-cog';
};

const getActionItems = (entry) => {
  const items = [];
  
  if (entry.communication_preference === 'email') {
    items.push({
      label: 'メール送信',
      icon: 'pi pi-envelope',
      command: () => sendManualEmail(entry)
    });
  } else if (entry.communication_preference === 'phone') {
    items.push({
      label: `電話番号: ${entry.contact_phone || '未設定'}`,
      icon: 'pi pi-phone',
      command: () => showPhoneNumber(entry)
    });
  }
  
  items.push({
    label: 'キャンセル',
    icon: 'pi pi-times',
    command: () => cancelEntryAction(entry)
  });
  
  return items;
};

const sendManualEmail = (entry) => {
  confirm.require({
    message: `「${entry.clientName || 'このクライアント'}」に手動で空室案内メールを送信しますか？この操作により、該当の順番待ちエントリーのステータスが「通知済み」に更新されます。`,
    header: '手動メール送信の確認',
    icon: 'pi pi-envelope',
    acceptLabel: 'はい、送信する',
    rejectLabel: 'いいえ、キャンセル',
    accept: async () => {
      if (!entry.id) {
        console.error('Entry ID is missing, cannot send manual email.');
        return;
      }
      const result = await sendManualNotification(entry.id);
      if (result && selectedHotelId.value) {
        fetchWaitlistEntries(selectedHotelId.value);
        console.log('Manual email process completed for entry:', entry.id, 'Result:', result);
      }
    },
    reject: () => {
      // Optional: Show a toast message that the action was cancelled
    }
  });
};

const showPhoneNumber = (entry) => {
  confirm.require({
    message: `電話番号: ${entry.contact_phone || '未設定'}\n\nこのお客様に電話で連絡した場合、ステータスを「通知済み」に変更しますか？`,
    header: '電話連絡の確認',
    icon: 'pi pi-phone',
    acceptLabel: 'はい、通知済みにする',
    rejectLabel: 'いいえ',
    accept: async () => {
      if (!entry.id) {
        console.error('Entry ID is missing, cannot update status.');
        return;
      }
      // Use the same API as manual notification to set status to notified
      const result = await sendManualNotification(entry.id);
      if (result && selectedHotelId.value) {
        fetchWaitlistEntries(selectedHotelId.value);
        console.log('Phone contact status updated for entry:', entry.id, 'Result:', result);
      }
    },
    reject: () => {
      // Just close the dialog
    }
  });
};

const cancelEntryAction = (entry) => {
  confirm.require({
    message: `「${entry.clientName || 'このクライアント'}」の順番待ちエントリーをキャンセルしますか？この操作は取り消せません。`,
    header: '順番待ちキャンセルの確認',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'キャンセル実行',
    rejectLabel: '中止',
    acceptClassName: 'p-button-warning',
    rejectClassName: 'p-button-text p-button-danger',
    accept: async () => {
      if (!entry.id) {
        console.error('Entry ID is missing, cannot cancel entry.');
        return;
      }
      const result = await cancelEntry(entry.id);
      if (result && selectedHotelId.value) {
        // Refresh the list after successful cancellation
        fetchWaitlistEntries(selectedHotelId.value);
        console.log('Entry cancelled successfully:', entry.id, 'Result:', result);
      }
    },
    reject: () => {
      // Optional: Show a toast message that the action was cancelled
    }
  });
};

// Add getStatusTagSeverity helper
const getStatusTagSeverity = (status) => {
  switch (status) {
    case 'waiting':
      return 'info';
    case 'notified':
      return 'success';
    case 'confirmed':
      return 'success';
    case 'expired':
      return 'danger';
    case 'cancelled':
      return 'danger';
    default:
      return null;
  }
};

// Add this method in <script setup>
const handleMainAction = (entry) => {
  const actions = getActionItems(entry);
  if (actions.length > 0 && typeof actions[0].command === 'function') {
    actions[0].command();
  }
};

// TODO: Fetch actual waitlist entries when the modal becomes visible,
// likely by calling a function from useWaitlistStore.
// This will be handled in a subsequent step.

</script>

<style scoped>
/* Custom styles for the modal if needed */
</style>
