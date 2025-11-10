<template>
  <Fieldset legend="アイコン凡例" class="mt-2 text-xs dark:text-gray-100">
    <div class="flex flex-wrap items-center gap-4">
      <span class="flex items-center gap-1">
        <i class="pi pi-pause bg-yellow-100 p-1 rounded dark:bg-yellow-800"></i>保留中
      </span>
      <span class="flex items-center gap-1">
        <i class="pi pi-clock bg-cyan-200 p-1 rounded dark:bg-cyan-800"></i>仮予約
      </span>
      <span class="flex items-center gap-1">
        <i class="pi pi-check-circle bg-sky-300 p-1 rounded dark:bg-sky-800"></i>確定予約
      </span>
      <span class="flex items-center gap-1">
        <i class="pi pi-user bg-green-400 p-1 rounded dark:bg-green-800"></i>チェックイン済み
      </span>
      <span class="flex items-center gap-1">
        <i class="pi pi-sign-out bg-gray-300 p-1 rounded dark:bg-gray-700"></i>チェックアウト済み
      </span>
      <span class="flex items-center gap-1">
        <i class="pi pi-id-card bg-purple-200 p-1 rounded dark:bg-purple-800"></i>社員
      </span>
      <span class="flex items-center gap-1">
        <i class="pi pi-car bg-red-100 p-1 rounded dark:bg-red-800"></i>管理ブロック
      </span>
      <span class="flex items-center gap-1">
        <i class="pi pi-times bg-red-100 p-1 rounded dark:bg-red-800"></i>ブロック
      </span>
      <span class="flex items-center gap-1">
        <i class="pi pi-lock bg-orange-100 p-1 rounded dark:bg-orange-800"></i>仮ブロック
      </span>
      <span class="flex items-center gap-1">
        <i class="pi pi-circle"></i>空き
      </span>
    </div>
  </Fieldset>
</template>

<script setup>
import { Fieldset } from 'primevue';
</script>
