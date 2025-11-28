<template>
  <Dialog v-model:visible="dialogVisible" :modal="true" style="width: 35vw">
    <template #header>
        <div>
            <span class="p-dialog-title">領収書発行</span>
            <div v-if="props.paymentData && props.paymentData.client_name" class="text-sm mt-1">
                <p>顧客名: {{ props.paymentData.client_name }}</p>
                <p v-if="props.paymentData.payment_date">
                    支払日: {{ formatDate(props.paymentData.payment_date) }}
                </p>
            </div>
        </div>
    </template>
    <div class="p-fluid grid">
      <div class="field col-span-12 my-2">
        <p><strong>合計支払額: {{ formatCurrency(props.totalAmount) }}</strong></p>
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
          <!-- This div will act as a row container for the tax inputs -->
          <div class="grid col-span-12 p-0">
              <div v-for="taxType in sortedTaxTypes" :key="taxType.id" class="field col-span-12 md:col-span-6 mt-6 mb-1">
                <FloatLabel>
                  <InputNumber :id="'taxAmount-' + taxType.id" v-model="allocatedAmounts[taxType.id]" mode="currency" currency="JPY" locale="ja-JP" @update:modelValue="updateAllocations" fluid />
                  <label :for="'taxAmount-' + taxType.id">{{ taxType.name }} ({{ (taxType.percentage * 100).toFixed(0) }}%)</label>
                </FloatLabel>
              </div>
          </div>
        </template>
        <!-- "Not Configured" Message -->
        <div v-else class="field col-span-12">
          <p>税区分が設定されていません。設定画面で税区分を登録してください。</p>
        </div>

        <!-- Allocation Summary Section (now full width and with top margin) -->
        <div class="field col-span-12 mt-4" v-if="sortedTaxTypes && sortedTaxTypes.length > 0">
          <p>割当済み合計: {{ formatCurrency(allocatedTotal) }}</p>
          <p :class="{'text-red-500': remainingAmount !== 0, 'text-green-500': remainingAmount === 0}">
            残額: {{ formatCurrency(remainingAmount) }}
          </p>
          <small v-if="remainingAmount !== 0" class="p-error">割当額が合計支払額と一致していません。</small>
          <!-- The sortedTaxTypes.length > 0 check for small is implicitly covered by the parent div's v-if -->
        </div>
      </template>
    </div>
    <template #footer>
      <Button label="キャンセル" icon="pi pi-times" @click="closeDialog" class="p-button-text p-button-danger p-button-sm"/>
      <Button label="発行" icon="pi pi-check" @click="generateReceipt" autofocus :disabled="(sortedTaxTypes.length > 0 && remainingAmount !== 0) || (sortedTaxTypes.length === 0 && props.totalAmount > 0)" />
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

    // Store
    import { useSettingsStore } from '@/composables/useSettingsStore';
    const settingsStore = useSettingsStore();

    // Refs
    const isLoadingTaxTypes = ref(false);
    const taxTypes = computed(() => settingsStore.taxTypes.value || []); // Keep for direct access to raw list if needed elsewhere

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
    isConsolidated: { // This prop seems unused in the new tax logic but keep for now
        type: Boolean,
        default: false
    },
    paymentData: { // Add this prop
        type: Object,
        default: () => null
    }
    });
    const emit = defineEmits(['update:visible', 'generate']);

    // Component State
    const dialogVisible = ref(false);
    const allocatedAmounts = ref({}); // Object to store amounts, keyed by tax type id
    const allocatedTotal = ref(0);
    const remainingAmount = ref(0);

    // Helper functions
    const formatCurrency = (value) => {
    if (value == null || isNaN(Number(value))) return '';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Return original if invalid
        // Simple YYYY/MM/DD format
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    };

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
    remainingAmount.value = props.totalAmount - allocatedTotal.value;
    };

    const closeDialog = () => {
    dialogVisible.value = false;
    emit('update:visible', false);
    };

    const generateReceipt = () => {
    if (remainingAmount.value !== 0 && taxTypes.value.length > 0) {
        console.error("Validation failed: Allocated amount does not match total amount.");
        // Add toast message here if PrimeVue's useToast is imported and setup
        return;
    }

    const breakdown = [];
    if (taxTypes.value && taxTypes.value.length > 0) {
        taxTypes.value.forEach(tt => {
            if (tt.visible && allocatedAmounts.value[tt.id] != null) {
                const taxableAmount = allocatedAmounts.value[tt.id];
                const taxValue = taxableAmount * tt.percentage;
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

    emit('generate', { taxBreakdownData: breakdown, paymentDetails: props.paymentData });
    closeDialog();
    };

    // Watchers
    watch(() => props.visible, async (isVisible) => {
        dialogVisible.value = isVisible;
        if (isVisible) {
            isLoadingTaxTypes.value = true;
            try {
                if (!settingsStore.taxTypes.value || settingsStore.taxTypes.value.length === 0) {
                    await settingsStore.fetchTaxTypes();
                }

                // Initialization logic
                allocatedAmounts.value = {};
                if (sortedTaxTypes.value && sortedTaxTypes.value.length > 0) {
                    // Initialize all visible tax types in allocatedAmounts to 0
                    sortedTaxTypes.value.forEach(tt => {
                        allocatedAmounts.value[tt.id] = 0;
                    });
                    // Default the totalAmount to the first tax type in the sorted list (highest rate)
                    if (props.totalAmount > 0) {
                        allocatedAmounts.value[sortedTaxTypes.value[0].id] = props.totalAmount;
                    }
                }
                updateAllocations(); // Recalculate totals

            } catch (error) {
                console.error("Failed to fetch tax types in ReceiptGenerationDialog:", error);
                // Consider adding a user-facing error message via toast if available
            } finally {
                isLoadingTaxTypes.value = false;
            }
        } else {
            // Reset when dialog is hidden
            allocatedAmounts.value = {};
            allocatedTotal.value = 0;
            remainingAmount.value = 0;
        }
    }, { immediate: true });

    watch(() => props.totalAmount, (newTotal) => {
        if (dialogVisible.value) {
            allocatedAmounts.value = {}; // Reset allocations
            if (sortedTaxTypes.value && sortedTaxTypes.value.length > 0) {
                // Initialize all visible tax types in allocatedAmounts to 0
                sortedTaxTypes.value.forEach(tt => {
                    allocatedAmounts.value[tt.id] = 0;
                });
                // Default the newTotal to the first tax type in the sorted list
                if (newTotal > 0) {
                    allocatedAmounts.value[sortedTaxTypes.value[0].id] = newTotal;
                }
            }
            updateAllocations();
        }
    });

    // Sync dialogVisible with props.visible for external control
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