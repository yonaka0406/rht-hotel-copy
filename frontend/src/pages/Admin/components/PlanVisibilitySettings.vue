<template>
  <div class="plan-visibility-settings">
    <Toast />

    <div v.if="isLoading" class="p-d-flex p-jc-center p-ai-center" style="height: 200px;">
      <ProgressSpinner />
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-if="!isLoading && !error">
      <h3>プラン表示設定</h3>
      <p>以下のグローバルプランをこのホテルで非表示にするにはチェックを入れてください。</p>

      <div class="p-fluid">
        <div v-for="plan in allGlobalPlans" :key="plan.id" class="field-checkbox m-2">
          <Checkbox :id="'plan_' + plan.id" v-model="selectedExclusions[plan.id]" :binary="true" />
          <label :for="'plan_' + plan.id" class="ml-2">{{ plan.name }}</label>
        </div>
      </div>

      <div class="p-mt-4">
        <Button label="保存" icon="pi pi-check" @click="saveChanges" :disabled="isLoading" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  hotelId: {
    type: Number,
    required: true
  }
});

const toast = useToast();

const allGlobalPlans = ref([]);
const excludedPlanIds = ref([]); // Keep track of originally excluded IDs if needed, though selectedExclusions is primary for UI
const selectedExclusions = ref({}); // Object: { planId1: true, planId2: false }

const isLoading = ref(false);
const error = ref(null);

const fetchPlanExclusions = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication token not found.');
    }
    const response = await fetch(`/api/hotels/${props.hotelId}/plan-exclusions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    allGlobalPlans.value = data.all_global_plans || [];
    excludedPlanIds.value = data.excluded_plan_ids || [];

    const newSelectedExclusions = {};
    if (allGlobalPlans.value.length > 0) {
      allGlobalPlans.value.forEach(plan => {
        newSelectedExclusions[plan.id] = excludedPlanIds.value.includes(plan.id);
      });
    }
    selectedExclusions.value = newSelectedExclusions;

  } catch (err) {
    console.error('Failed to load plan visibility settings:', err);
    error.value = err.message || 'Failed to load plan visibility settings.';
    toast.add({ severity: 'error', summary: 'Error Loading', detail: error.value, life: 3000 });
  } finally {
    isLoading.value = false;
  }
};

const saveChanges = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication token not found.');
    }

    const newExcludedIds = Object.keys(selectedExclusions.value)
      .filter(id => selectedExclusions.value[id])
      .map(Number);

    const response = await fetch(`/api/hotels/${props.hotelId}/plan-exclusions`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ global_plan_ids: newExcludedIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Settings saved successfully!', life: 3000 });
    // Re-fetch to ensure UI consistency with server state
    await fetchPlanExclusions();

  } catch (err) {
    console.error('Failed to save settings:', err);
    error.value = err.message || 'Failed to save settings.';
    toast.add({ severity: 'error', summary: 'Error Saving', detail: error.value, life: 3000 });
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  if (props.hotelId) {
    fetchPlanExclusions();
  } else {
    error.value = "Hotel ID is not provided.";
    toast.add({ severity: 'error', summary: 'Configuration Error', detail: error.value, life: 3000 });
  }
});

</script>

<style scoped>
.plan-visibility-settings {
  padding: 1rem;
}
.field-checkbox {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem; /* PrimeFlex m-2 provides margin on all sides, this is more specific */
}
.ml-2 {
  margin-left: 0.5rem; /* PrimeFlex class if available, otherwise define here */
}
.p-mt-4 {
  margin-top: 1rem; /* PrimeFlex class if available */
}
/* Add any other custom styles you need */
</style>
