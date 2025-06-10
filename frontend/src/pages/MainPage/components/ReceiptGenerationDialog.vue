<template>
  <Dialog v-model:visible="dialogVisible" header="領収書発行" :modal="true" style="width: 50vw">
    <div class="p-fluid grid formgrid">
      <div class="field col-12">
        <p><strong>合計支払額: {{ formatCurrency(props.totalAmount) }}</strong></p>
      </div>

      <!-- Loading Indicator -->
      <div v-if="isLoadingTaxTypes" class="field col-12 text-center">
        <p>税区分を読み込み中...</p>
        <!-- Optionally, you could add a PrimeVue spinner component here if desired -->
        <!-- e.g., <ProgressSpinner style="width:50px;height:50px" strokeWidth="8" /> -->
      </div>

      <!-- Existing Tax UI and "Not Configured" Message -->
      <template v-else>
        <template v-if="taxTypes && taxTypes.length > 0">
          <div v-for="taxType in taxTypes.filter(t => t.visible)" :key="taxType.id" class="field col-12 md:col-6">
            <label :for="'taxAmount-' + taxType.id">{{ taxType.name }} ({{ (taxType.percentage * 100).toFixed(0) }}%)</label>
            <InputNumber :id="'taxAmount-' + taxType.id" v-model="allocatedAmounts[taxType.id]" mode="currency" currency="JPY" locale="ja-JP" @update:modelValue="updateAllocations" />
          </div>
        </template>
        <div v-else class="field col-12">
          <p>税区分が設定されていません。設定画面で税区分を登録してください。</p>
        </div>

        <!-- This part (allocatedTotal, remainingAmount, error message) should also only show when not loading -->
        <div class="field col-12 md:col-6">
            <p>割当済み合計: {{ formatCurrency(allocatedTotal) }}</p>
            <p :class="{'text-red-500': remainingAmount !== 0, 'text-green-500': remainingAmount === 0}">
            残額: {{ formatCurrency(remainingAmount) }}
            </p>
            <small v-if="remainingAmount !== 0 && taxTypes.length > 0" class="p-error">割当額が合計支払額と一致していません。</small>
        </div>
      </template>
    </div>
    <template #footer>
      <Button label="キャンセル" icon="pi pi-times" @click="closeDialog" class="p-button-text"/>
      <Button label="発行" icon="pi pi-check" @click="generateReceipt" autofocus :disabled="remainingAmount !== 0 && taxTypes.length > 0" />
    </template>
  </Dialog>
</template>

<script setup>
    // Vue
    import { ref, defineProps, defineEmits, watch, computed, onMounted } from 'vue';

    // Primevue
    import Dialog from 'primevue/dialog';
    import Button from 'primevue/button';
    import InputNumber from 'primevue/inputnumber';

    // Store
    import { useSettingsStore } from '@/composables/useSettingsStore';
    const settingsStore = useSettingsStore();

    // Refs
    const isLoadingTaxTypes = ref(false);
    const taxTypes = computed(() => settingsStore.taxTypes.value || []);

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
                let firstEditableTaxType = null;
                // Use the 'taxTypes' computed property here, it will be up-to-date
                if (taxTypes.value && taxTypes.value.length > 0) {
                    taxTypes.value.forEach(tt => {
                        if (tt.visible) {
                            allocatedAmounts.value[tt.id] = 0; // Initialize with 0
                            if (!firstEditableTaxType) firstEditableTaxType = tt.id;
                        }
                    });
                    // Auto-allocate totalAmount to the first editable tax type
                    if (firstEditableTaxType && props.totalAmount > 0) {
                        allocatedAmounts.value[firstEditableTaxType] = props.totalAmount;
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
            allocatedAmounts.value = {};
            let firstEditableTaxType = null;
            if (taxTypes.value && taxTypes.value.length > 0) {
                taxTypes.value.forEach(tt => {
                    if (tt.visible) {
                        allocatedAmounts.value[tt.id] = 0;
                        if (!firstEditableTaxType) firstEditableTaxType = tt.id;
                    }
                });
                if (firstEditableTaxType && newTotal > 0) {
                    allocatedAmounts.value[firstEditableTaxType] = newTotal;
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