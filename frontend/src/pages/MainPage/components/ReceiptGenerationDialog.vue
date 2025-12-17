<template>
  <Dialog v-model:visible="dialogVisible" :modal="true" style="width: 50vw">
    <template #header>
      <div>
        <span class="p-dialog-title">領収書発行</span>
        <div v-if="props.paymentData && props.paymentData.client_name" class="text-sm mt-1">
          <p>顧客名: {{ props.paymentData.client_name }}</p>
          <p v-if="props.paymentData.payment_date">
            支払日: {{ formatDate(props.paymentData.payment_date) }}
          </p>
          <p v-if="props.paymentData.existing_receipt_number">
            領収書No.: {{ props.paymentData.existing_receipt_number }} (Ver. {{ props.paymentData.version || 1 }})
          </p>
        </div>
      </div>
    </template>
    <p class="text-sm text-gray-600 mb-4">
      ※ 支払金額は、どの税区分に割り当てられるか指定されません。税区分の配分は、領収書を作成する方が適切に判断し、入力してください。
    </p>
    <div class="p-fluid grid">
      <div class="field col-span-12 my-2">
        <p><strong>合計支払額: {{ formatCurrency(displayTotalAmount) }}</strong></p>
      </div>

      <!-- Loading Indicator -->
      <div v-if="isLoadingTaxTypes" class="field col-span-12 text-center">
        <p>税区分を読み込み中...</p>
        <!-- Optionally, you could add a PrimeVue spinner component here if desired -->
        <!-- e.g., <ProgressSpinner style="width:50px;height:50px" strokeWidth="8" /> -->
      </div>

      <!-- Existing Tax UI and "Not Configured" Message -->
      <template v-else>
        <!-- Tax Inputs Section -->
        <template v-if="sortedTaxTypes && sortedTaxTypes.length > 0">
          <div class="grid col-span-12 p-0">
            <div v-for="taxType in sortedTaxTypes" :key="taxType.id" class="field col-span-12 md:col-span-6 mt-6 mb-1">
              <FloatLabel>
                <InputNumber :id="'taxAmount-' + taxType.id" v-model="allocatedAmounts[taxType.id]" mode="currency"
                  currency="JPY" locale="ja-JP" @update:modelValue="updateAllocations" fluid />
                <label :for="'taxAmount-' + taxType.id">{{ taxType.name }} ({{ (taxType.percentage * 100).toFixed(0)
                  }}%)</label>
              </FloatLabel>
              <small class="text-gray-500 mt-1 block">
                （予約内訳: {{ formatCurrency(getReservationTaxAmount(taxType.percentage)) }}）
              </small>
            </div>
          </div>
        </template>
        <!-- "Not Configured" Message -->
        <div v-else class="field col-span-12">
          <p>税区分が設定されていません。設定画面で税区分を登録してください。</p>
        </div>

        <!-- Allocation Summary Section -->
        <div class="field col-span-12 mt-4" v-if="sortedTaxTypes && sortedTaxTypes.length > 0">
          <p>割当済み合計: {{ formatCurrency(allocatedTotal) }}</p>
          <p :class="{ 'text-red-500': !isValidAllocation, 'text-green-500': isValidAllocation }">
            残額: {{ formatCurrency(remainingAmount) }}
            <span v-if="matchesExisting && Math.abs(remainingAmount) >= 1.0" class="text-sm ml-2">(既存領収書額と一致)</span>
          </p>
          <small v-if="!isValidAllocation" class="p-error">割当額が合計支払額と一致していません。</small>
        </div>

        <!-- Receipt Customization Section -->
        <div class="field col-span-12 mt-6 border-t pt-4">
          <h3 class="text-base font-semibold mb-4">領収書カスタマイズ</h3>

          <div class="grid col-span-12 gap-4">
            <!-- Honorific Selection -->
            <div class="field col-span-12 md:col-span-6 mt-6">
              <FloatLabel>
                <Select id="honorific" v-model="honorific" :options="honorificOptions" optionLabel="label"
                  optionValue="value" fluid />
                <label for="honorific">敬称</label>
              </FloatLabel>
            </div>
            <!-- Custom Issue Date -->
            <div class="field col-span-12 md:col-span-6 mt-6">
              <FloatLabel>
                <DatePicker id="customIssueDate" v-model="customIssueDate" dateFormat="yy-mm-dd" :showIcon="true"
                  fluid />
                <label for="customIssueDate">発行日（カスタム）</label>
              </FloatLabel>
              <small class="text-gray-500">空欄の場合は支払日が使用されます</small>
            </div>
            <!-- Custom Proviso -->
            <div class="field col-span-12 mt-6">
              <FloatLabel>
                <Textarea id="customProviso" v-model="customProviso" rows="2" fluid />
                <label for="customProviso">但し書き（カスタム）</label>
              </FloatLabel>
              <small class="text-gray-500">空欄の場合は「施設名 宿泊料として」が使用されます</small>
            </div>
            <!-- Reissue Checkbox -->
            <div class="field col-span-12 flex items-center gap-2">
              <Checkbox id="isReissue" v-model="isReissue" :binary="true" />
              <label for="isReissue" class="cursor-pointer">再発行</label>
              <small class="text-gray-500">（再発行スタンプを表示）</small>
            </div>
          </div>
        </div>

        <!-- Versioning Notification -->
        <div v-if="props.paymentData && props.paymentData.existing_receipt_number" class="field col-span-12 mt-4">
           <div v-if="isChanged" class="p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-900 text-sm">
             <i class="pi pi-exclamation-triangle mr-2"></i>
             変更が検出されました。新しいバージョンとして保存・発行されます。
           </div>
           <div v-else class="p-3 bg-blue-100 border border-blue-300 rounded text-blue-900 text-sm">
             <i class="pi pi-info-circle mr-2"></i>
             変更がないため、既存の領収書データを使用します。
           </div>
        </div>
      </template>
    </div>
    <template #footer>
      <Button label="キャンセル" icon="pi pi-times" @click="closeDialog" severity="secondary" text />
      <Button label="発行" icon="pi pi-check" @click="generateReceipt" autofocus
        :disabled="(sortedTaxTypes.length > 0 && remainingAmount !== 0) || (sortedTaxTypes.length === 0 && props.totalAmount > 0)"
        text />
    </template>
  </Dialog>
</template>

<script setup>
    // Vue
    import { ref, watch, computed } from 'vue';

// Primevue
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import FloatLabel from 'primevue/floatlabel';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';

// Store
import { useSettingsStore } from '@/composables/useSettingsStore';
const settingsStore = useSettingsStore();

// Refs
const isLoadingTaxTypes = ref(false);

// Receipt customization state
const honorific = ref('様');
const customIssueDate = ref(null);
const customProviso = ref('');
const isReissue = ref(false);

// Honorific options
const honorificOptions = [
  { label: '様', value: '様' },
  { label: '御中', value: '御中' },
  { label: '殿', value: '殿' },
  { label: '先生', value: '先生' }
];
const taxTypes = computed(() => settingsStore.taxTypes.value || []);

const sortedTaxTypes = computed(() => {
  if (!settingsStore.taxTypes.value) return [];
  return [...settingsStore.taxTypes.value]
    .filter(tt => tt.visible)
    .sort((a, b) => b.percentage - a.percentage);
});

// Props & Emits
const props = defineProps({
  visible: Boolean,
  totalAmount: {
    type: Number,
    default: 0
  },
  isConsolidated: {
    type: Boolean,
    default: false
  },
  paymentData: {
    type: Object,
    default: () => null
  },
  isReissue: {
    type: Boolean,
    default: false
  }
});
const emit = defineEmits(['update:visible', 'generate']);

// Component State
const dialogVisible = ref(false);
const allocatedAmounts = ref({});
const allocatedTotal = ref(0);
const remainingAmount = ref(0);

const existingBreakdownTotal = computed(() => {
  if (props.paymentData && props.paymentData.existing_tax_breakdown && Array.isArray(props.paymentData.existing_tax_breakdown)) {
    return props.paymentData.existing_tax_breakdown.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }
  return 0;
});

const matchesExisting = computed(() => {
  if (!existingBreakdownTotal.value) return false;
  return Math.abs(allocatedTotal.value - existingBreakdownTotal.value) < 1.0;
});

const isValidAllocation = computed(() => {
  if (sortedTaxTypes.value.length === 0) return props.totalAmount === 0;
  return Math.abs(remainingAmount.value) < 1.0 || matchesExisting.value;
});

const displayTotalAmount = computed(() => {
  // If we have a valid existing breakdown (indicating an existing receipt), use its total.
  // This handles consolidated receipts where the receipt total > single payment amount.
  return existingBreakdownTotal.value > 0 ? existingBreakdownTotal.value : props.totalAmount;
});

// Helper to get the total amount for a specific tax rate from reservation_tax_breakdown
const getReservationTaxAmount = (taxPercentage) => {
  if (props.paymentData && props.paymentData.reservation_tax_breakdown) {
    const taxItem = props.paymentData.reservation_tax_breakdown.find(
      item => Math.abs(parseFloat(item.tax_rate) - taxPercentage) < 0.0001
    );
    return taxItem ? taxItem.total_amount : 0;
  }
  return 0;
};

// Helper functions
const formatCurrency = (value) => {
  if (value == null || isNaN(Number(value))) return '';
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};

const calculatePayableTax = (taxableAmount, percentage) => {
  if (taxableAmount == null || isNaN(Number(taxableAmount)) || percentage == null || isNaN(Number(percentage))) return 0;
  // Formula: tax = amount - (amount / (1 + rate))
  // Example: For ¥10,000 at 8%: tax = 10000 - (10000 / 1.08) = 740.74 ≈ 740
  const taxValue = Math.floor(taxableAmount - (taxableAmount / (1 + parseFloat(percentage))));
  return taxValue;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

// Computed property to detect changes
const isChanged = computed(() => {
  if (!props.paymentData || !props.paymentData.existing_receipt_number) {
    return true; // New receipt, always treated as "change" (or rather, new data)
  }

  // 1. Check customization fields
  const currentHonorific = honorific.value;
  const originalHonorific = props.paymentData.existing_honorific || '様';
  if (currentHonorific !== originalHonorific) return true;

  const currentProviso = customProviso.value || '';
  const originalProviso = props.paymentData.existing_custom_proviso || '';
  if (currentProviso !== originalProviso) return true;

  const currentReissue = isReissue.value;
  const originalReissue = props.paymentData.existing_is_reissue || false;
  if (currentReissue !== originalReissue) return true;

  // Date comparison
  let currentDateStr = '';
  if (customIssueDate.value) {
    const d = new Date(customIssueDate.value);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    currentDateStr = `${year}-${month}-${day}`;
  }
  const originalDateStr = props.paymentData.existing_receipt_date ? props.paymentData.existing_receipt_date.split('T')[0] : '';
  if (currentDateStr !== originalDateStr) return true;


  // 2. Check Tax Breakdown
  const existingBreakdown = props.paymentData.existing_tax_breakdown || [];
  const existingMap = {};
  existingBreakdown.forEach(item => {
    existingMap[item.id] = Number(item.amount);
  });

  for (const [id, amount] of Object.entries(allocatedAmounts.value)) {
    const numAmount = Number(amount);
    const existingAmount = existingMap[id] || 0;
    if (numAmount !== existingAmount) return true;
  }
  
  return false;
});

// Methods
const updateAllocations = () => {
  let currentTotal = 0;
  if (taxTypes.value && taxTypes.value.length > 0) {
    taxTypes.value.forEach(tt => {
      if (tt.visible && allocatedAmounts.value[tt.id]) {
        currentTotal += allocatedAmounts.value[tt.id];
      }
    });
  }
  allocatedTotal.value = currentTotal;
  remainingAmount.value = displayTotalAmount.value - allocatedTotal.value;
};

const closeDialog = () => {
  dialogVisible.value = false;
  emit('update:visible', false);
};

const generateReceipt = () => {
  if (remainingAmount.value !== 0 && taxTypes.value.length > 0) {
    console.error("Validation failed: Allocated amount does not match total amount.");
    return;
  }

  const breakdown = [];
  if (taxTypes.value && taxTypes.value.length > 0) {
    taxTypes.value.forEach(tt => {
      if (tt.visible && allocatedAmounts.value[tt.id] != null) {
        const taxableAmount = allocatedAmounts.value[tt.id];
        // Calculate tax from tax-inclusive amount
        // Formula: tax = amount - (amount / (1 + rate))
        // Example: For ¥10,000 at 8%: tax = 10000 - (10000 / 1.08) = 740.74 ≈ 740
        const taxValue = Math.floor(taxableAmount - (taxableAmount / (1 + parseFloat(tt.percentage))));
        breakdown.push({
          id: tt.id,
          name: tt.name,
          rate: tt.percentage,
          amount: taxableAmount,
          tax_amount: taxValue
        });
      }
    });
  }

  let formattedIssueDate = null;
  if (customIssueDate.value) {
    const d = new Date(customIssueDate.value);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    formattedIssueDate = `${year}-${month}-${day}`;
  }
  emit('generate', {
    taxBreakdownData: breakdown,
    paymentDetails: props.paymentData,
    honorific: honorific.value,
    isReissue: isReissue.value,
    customIssueDate: formattedIssueDate,
    customProviso: customProviso.value || null,
    forceRegenerate: isChanged.value
  });
  closeDialog();
};

// Watchers
const initializeDialogState = async () => {
  isLoadingTaxTypes.value = true;
  try {
    if (!settingsStore.taxTypes.value || settingsStore.taxTypes.value.length === 0) {
      await settingsStore.fetchTaxTypes();
    }

    // Initialization logic
    // Initialize allocatedAmounts with 0 for all visible tax types
    allocatedAmounts.value = {};
    if (sortedTaxTypes.value && sortedTaxTypes.value.length > 0) {
      sortedTaxTypes.value.forEach(tt => {
        allocatedAmounts.value[tt.id] = 0;
      });
    }

    // Pre-fill from existing tax breakdown if available
    if (props.paymentData && props.paymentData.existing_tax_breakdown && Array.isArray(props.paymentData.existing_tax_breakdown)) {
      props.paymentData.existing_tax_breakdown.forEach(item => {
        if (allocatedAmounts.value.hasOwnProperty(item.id)) { // Only allocate if the tax type exists
           allocatedAmounts.value[item.id] = Number(item.amount);
        }
      });
    } else if (sortedTaxTypes.value && sortedTaxTypes.value.length > 0 && props.totalAmount > 0) {
      // If no existing breakdown, default the entire total to the first visible tax type
      allocatedAmounts.value[sortedTaxTypes.value[0].id] = props.totalAmount;
    }

    updateAllocations();

    // Initialize customization fields
    if (props.paymentData && props.paymentData.existing_receipt_number) {
      honorific.value = props.paymentData.existing_honorific || '様';
      customProviso.value = props.paymentData.existing_custom_proviso || '';
      if (props.paymentData.existing_receipt_date) {
        customIssueDate.value = new Date(props.paymentData.existing_receipt_date);
      } else {
        customIssueDate.value = null; // Clear if no existing date
      }
      isReissue.value = props.paymentData.existing_is_reissue;
    } else {
      // Reset customization fields for new receipts
      honorific.value = '様';
      customProviso.value = '';
      customIssueDate.value = null;
      isReissue.value = false;
    }

  } catch (error) {
    console.error("Failed to fetch tax types or initialize dialog state in ReceiptGenerationDialog:", error);
  } finally {
    isLoadingTaxTypes.value = false;
  }
};

watch(() => props.visible, async (isVisible) => {
  dialogVisible.value = isVisible;
  if (isVisible) {
    // initializeDialogState will be called by the watch on props.paymentData
    // if paymentData changes, or it will be called explicitly if paymentData
    // doesn't change but the dialog becomes visible for the first time
    // or after being closed.
    // However, to ensure it runs even if paymentData doesn't change but
    // the dialog is opened (e.g., first time mount), we can call it here,
    // and let the paymentData watcher handle subsequent data changes.
    // Or, more cleanly, make the paymentData watcher handle the *entire* initialization
    // whenever the dialog is visible.

    // Given the prompt, the issue is about re-initialization with *different* data.
    // The props.paymentData watch should handle this.
    // But if props.paymentData doesn't change (e.g. re-opening the *same* dialog),
    // we still need to initialize.

    // Let's call it here for robustness if paymentData happens to be the same,
    // but the dialog was closed and re-opened.
    await initializeDialogState();

  } else {
    // Reset logic when dialog is closed
    allocatedAmounts.value = {};
    allocatedTotal.value = 0;
    remainingAmount.value = 0;
    honorific.value = '様';
    customIssueDate.value = null;
    customProviso.value = '';
    isReissue.value = false;
  }
});

watch(() => props.paymentData, async (newVal, oldVal) => {
  // Only re-initialize if the dialog is visible AND paymentData has actually changed
  // (or it's the very first time paymentData is set and dialog is visible).
  // Deep comparison for objects is usually required here, but for now
  // let's assume if the object reference changes, we re-initialize.
  // If paymentData is null or undefined, we should also reset.
  const hasPaymentDataChanged = JSON.stringify(newVal) !== JSON.stringify(oldVal);

  if (dialogVisible.value && hasPaymentDataChanged) {
      await initializeDialogState();
  } else if (!newVal) { // If paymentData becomes null/undefined while dialog is open, reset
      // This is a defensive reset, though ideally paymentData shouldn't become null while dialog is open
      allocatedAmounts.value = {};
      allocatedTotal.value = 0;
      remainingAmount.value = 0;
      honorific.value = '様';
      customIssueDate.value = null;
      customProviso.value = '';
      isReissue.value = false;
  }
}, { deep: true, immediate: true }); // Use deep watch for paymentData and immediate to handle initial load

watch(dialogVisible, (newValue) => {
  if (props.visible !== newValue) {
    emit('update:visible', newValue);
  }
});

</script>

<style scoped>
.text-red-500 {
  color: var(--p-red-500);
}

.text-green-500 {
  color: var(--p-green-500);
}
</style>