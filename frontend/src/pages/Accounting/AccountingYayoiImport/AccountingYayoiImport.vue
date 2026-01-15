<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
    <div class="bg-slate-50 dark:bg-slate-900 min-h-screen p-6">
        <div class="max-w-4xl mx-auto">
            <div class="mb-6 flex items-center gap-4">
                <button @click="router.back()" class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <i class="pi pi-arrow-left text-slate-600 dark:text-slate-400"></i>
                </button>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">弥生会計インポート</h1>
            </div>

            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
                <div class="w-20 h-20 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i class="pi pi-upload text-3xl text-violet-600 dark:text-violet-400"></i>
                </div>
                <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">ファイルアップロード</h2>
                <p class="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                    弥生会計のエクスポートファイル（CSV/Excel）をアップロードしてください。<br>
                    システムがデータを解析し、照合を行います。
                </p>
                
                <div class="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 hover:border-violet-500 dark:hover:border-violet-400 transition-colors cursor-pointer bg-slate-50 dark:bg-slate-900/50">
                    <i class="pi pi-file text-4xl text-slate-400 mb-4 block"></i>
                    <span class="text-sm font-medium text-slate-600 dark:text-slate-300">
                        クリックしてファイルを選択するか、<br>ここにドロップしてください
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>