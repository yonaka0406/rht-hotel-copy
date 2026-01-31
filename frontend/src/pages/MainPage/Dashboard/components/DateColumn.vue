<template>
  <Column :field="field">
    <template #header>
      <span class="hidden sm:inline">{{ headerText }}</span>
      <span class="sm:hidden">{{ mobileHeaderText }}</span>
    </template>
    <template #body="slotProps">
      <span class="hidden sm:inline">{{ formatValue(slotProps.data, valueField, false) }}</span>
      <span class="sm:hidden">{{ formatValue(slotProps.data, compactValueField, true) }}</span>
    </template>
  </Column>
</template>

<script setup>
import Column from 'primevue/column';
import { formatCompactDate, formatDate as formatFullDate } from '@/utils/dateUtils';

defineProps({
  field: {
    type: String,
    default: 'date'
  },
  headerText: {
    type: String,
    default: '日付'
  },
  mobileHeaderText: {
    type: String,
    default: '日'
  },
  valueField: {
    type: String,
    default: 'date'
  },
  compactValueField: {
    type: String,
    default: 'date'
  }
});

const formatValue = (data, fieldName, isCompact) => {
  const val = data[fieldName];
  if (!val) return '';

  // If the value is a Date object or the field is 'originalDate', we format it
  if (fieldName === 'originalDate' || val instanceof Date) {
    return isCompact ? formatCompactDate(val) : formatFullDate(val);
  }

  return val;
};
</script>
