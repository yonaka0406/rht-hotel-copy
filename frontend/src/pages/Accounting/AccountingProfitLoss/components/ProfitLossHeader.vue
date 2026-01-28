<template>
  <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <button @click="$router.push({ name: 'AccountingDashboard' })"
        class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer shadow-sm h-[46px]">
        <i class="pi pi-arrow-left text-sm"></i>
        <span>戻る</span>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
          損益計算書
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          部門別・ホテル別の損益分析レポート
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
</script>
