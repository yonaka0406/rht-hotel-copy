<template>
  <Fieldset legend="アイコン凡例" class="mt-2 text-xs dark:text-gray-100">
    <div class="flex flex-wrap items-center gap-4">
      <span v-for="item in legendItems" :key="item.label" class="flex items-center gap-1">
        <i :class="['pi', item.icon, item.bgClass, 'p-1', 'rounded']" aria-hidden="true"></i>{{ item.label }}
      </span>
    </div>
  </Fieldset>
</template>

<script setup>
import { Fieldset } from 'primevue';

const legendItems = [
  { icon: 'pi-pause', bgClass: 'bg-yellow-100 dark:bg-yellow-800', label: '保留中' },
  { icon: 'pi-clock', bgClass: 'bg-cyan-200 dark:bg-cyan-800', label: '仮予約' },
  { icon: 'pi-check-circle', bgClass: 'bg-sky-300 dark:bg-sky-800', label: '確定予約' },
  { icon: 'pi-user', bgClass: 'bg-green-400 dark:bg-green-800', label: 'チェックイン済み' },
  { icon: 'pi-sign-out', bgClass: 'bg-gray-300 dark:bg-gray-700', label: 'チェックアウト済み' },
  { icon: 'pi-id-card', bgClass: 'bg-purple-200 dark:bg-purple-800', label: '社員' },
  { icon: 'pi-times', bgClass: 'bg-red-100 dark:bg-red-800', label: 'ブロック' },
  { icon: 'pi-lock', bgClass: 'bg-orange-100 dark:bg-orange-800', label: '仮ブロック' },
  { icon: 'pi-circle', bgClass: '', label: '空き' },
];
</script>
