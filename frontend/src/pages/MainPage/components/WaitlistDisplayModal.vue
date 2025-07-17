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
            :severity="getMainActionSeverity(slotProps.data)"
            v-tooltip.top="{ value: '予約部によってEメール送信がまだ検証されていません。', disabled: !isEmailActionDisabled(slotProps.data) }"
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
import axios from 'axios';

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

const vacancyStatus = ref({}); // { [entry.id]: true/false }

// Function to check vacancy for a waitlist entry
const checkVacancy = async (entry) => {
  if (!entry) return false;
  // Avoid duplicate requests
  if (vacancyStatus.value[entry.id] !== undefined) return vacancyStatus.value[entry.id];
  
  const payload = {
    hotel_id: entry.hotel_id,
    room_type_id: entry.room_type_id || null,
    check_in: entry.requested_check_in_date,
    check_out: entry.requested_check_out_date,
    number_of_rooms: entry.number_of_rooms,
    number_of_guests: entry.number_of_guests,
    smoking_preference: entry.preferred_smoking_status === 'smoking' ? true : (entry.preferred_smoking_status === 'non_smoking' ? false : null)
  };
  
  try {
    const response = await axios.post('/api/waitlist/check-vacancy', payload);
    vacancyStatus.value[entry.id] = response.data.available;
    return response.data.available;
  } catch (e) {
    vacancyStatus.value[entry.id] = false;
    return false;
  }
};

// Watch for entries and check vacancy for each
watch(entries, (newEntries) => {
  if (Array.isArray(newEntries)) {
    newEntries.forEach(entry => {
      checkVacancy(entry);
    });
  }
}, { immediate: true });

// Fetch data when modal becomes visible and hotelId is available
watch(() => [props.visible, selectedHotelId.value], ([newVisible, hotelId]) => {
  if (newVisible && hotelId) {
    // Only fetch entries with status 'waiting' and 'notified'.
    fetchWaitlistEntries(hotelId, { filters: { status: ['waiting', 'notified'] } });
  }
}, { immediate: true });

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

const getMainActionSeverity = (entry) => {
  const actions = getActionItems(entry);
  if (actions.length > 0 && actions[0].disabled) {
    return 'secondary';
  }
  return 'primary';
};

const getActionItems = (entry) => {
  const items = [];
  const disabled = vacancyStatus.value[entry.id] === false;
  
  if (entry.communication_preference === 'email') {
    items.push({
      label: 'メール送信',
      icon: 'pi pi-envelope',
      command: () => sendManualEmail(entry),
      disabled: true // Disable email sending
    });
  } else if (entry.communication_preference === 'phone') {
    items.push({
      label: `電話番号: ${entry.contact_phone || '未設定'}`,
      icon: 'pi pi-phone',
      command: () => showPhoneNumber(entry),
      disabled: false
    });
  }
  items.push({
    label: 'キャンセル',
    icon: 'pi pi-times',
    command: () => cancelEntryAction(entry),
    disabled: false
  });
  return items;
};

const sendManualEmail = (entry) => {
  confirm.require({
    message: `「${entry.clientName || 'このクライアント'}」に手動で空室案内メールを送信しますか？この操作により、該当の順番待ちエントリーのステータスが「通知済み」に更新されます。`,
    header: '手動メール送信の確認',
    icon: 'pi pi-envelope',
    acceptProps: {
      label: '送信',
      severity: 'success'
    },
    rejectProps: {
      label: 'キャンセル',
      severity: 'secondary',
      outlined: true
    },
    accept: async () => {
      if (!entry.id) {
        return;
      }
      const result = await sendManualNotification(entry.id);
      if (result && selectedHotelId.value) {
        fetchWaitlistEntries(selectedHotelId.value, { filters: { status: ['waiting', 'notified'] } });
      }
      confirm.close();
    },
    reject: () => {
      // Optional: Show a toast message that the action was cancelled
      confirm.close();
    }
  });
};

const showPhoneNumber = (entry) => {
  confirm.require({
    message: `電話番号: ${entry.contact_phone || '未設定'}\n\nこのお客様に電話で連絡した場合、ステータスを「通知済み」に変更しますか？`,
    header: '電話連絡の確認',
    icon: 'pi pi-phone',
    acceptProps: {
      label: '通知済みにする',
      severity: 'success'
    },
    rejectProps: {
      label: 'キャンセル',
      severity: 'secondary',
      outlined: true
    },
    accept: async () => {
      if (!entry.id) {
        return;
      }
      // Use the same API as manual notification to set status to notified
      const result = await sendManualNotification(entry.id);
      if (result && selectedHotelId.value) {
        fetchWaitlistEntries(selectedHotelId.value, { filters: { status: ['waiting', 'notified'] } });
      }
      confirm.close();
    },
    reject: () => {
      // Just close the dialog
      confirm.close();
    }
  });
};

const cancelEntryAction = (entry) => {
  confirm.require({
    message: `「${entry.clientName || 'このクライアント'}」の順番待ちエントリーをキャンセルしますか？この操作は取り消せません。`,
    header: '順番待ちキャンセルの確認',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: {
      label: 'キャンセル実行',
      severity: 'danger'
    },
    rejectProps: {
      label: 'キャンセル',
      severity: 'secondary',
      outlined: true
    },
    accept: async () => {
      if (!entry.id) {
        return;
      }
      const result = await cancelEntry(entry.id);
      if (result && selectedHotelId.value) {
        // Refresh the list after successful cancellation
        fetchWaitlistEntries(selectedHotelId.value, { filters: { status: ['waiting', 'notified'] } });
      }
      confirm.close();
    },
    reject: () => {
      // Optional: Show a toast message that the action was cancelled
      confirm.close();
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
  if (actions.length > 0 && typeof actions[0].command === 'function' && !actions[0].disabled) {
    actions[0].command();
  }
};

// TODO: Fetch actual waitlist entries when the modal becomes visible,
// likely by calling a function from useWaitlistStore.
// This will be handled in a subsequent step.

const isEmailActionDisabled = (entry) => {
  const items = getActionItems(entry);
  return entry.communication_preference === 'email' && items.length > 0 && items[0].disabled;
};

</script>

<style scoped>
/* Custom styles for the modal if needed */
</style>
