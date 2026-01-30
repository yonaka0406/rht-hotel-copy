<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" 
        :header="`${parentAccount?.name || ''} の補助科目管理`" 
        modal class="w-full max-w-4xl" :dismissableMask="true">
        
        <div class="p-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                    <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300">
                        {{ parentAccount?.code }} - {{ parentAccount?.name }}
                    </h3>
                    <p class="text-sm text-slate-500 mt-1">
                        この勘定科目に紐づく補助科目を管理します。
                    </p>
                </div>
                <button @click="$emit('create', parentAccount)"
                    class="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none shrink-0">
                    <i class="pi pi-plus"></i> 補助科目を追加
                </button>
            </div>

            <div class="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-2xl">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest w-24">
                                順序</th>
                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                補助科目名</th>
                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                コード</th>
                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                説明</th>
                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest w-24">
                                状態</th>
                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest w-32">
                                操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in sortedSubAccounts" :key="item.id"
                            class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td class="py-4 px-4 font-black tabular-nums">{{ item.display_order }}</td>
                            <td class="py-4 px-4 font-bold">{{ item.name }}</td>
                            <td class="py-4 px-4 font-mono text-sm text-slate-600 dark:text-slate-400">{{ item.code || '-' }}</td>
                            <td class="py-4 px-4 text-sm text-slate-500">{{ item.description || '-' }}</td>
                            <td class="py-4 px-4">
                                <span
                                    :class="item.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
                                    class="text-[10px] font-black px-2 py-1 rounded-md uppercase">
                                    {{ item.is_active ? '有効' : '無効' }}
                                </span>
                            </td>
                            <td class="py-4 px-4">
                                <div class="flex gap-2">
                                    <button @click="$emit('edit', item)"
                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer">
                                        <i class="pi pi-pencil"></i>
                                    </button>
                                    <button @click="$emit('delete', item)"
                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer">
                                        <i class="pi pi-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="sortedSubAccounts.length === 0">
                            <td colspan="6" class="py-12 text-center text-slate-400 font-medium">
                                補助科目が登録されていません。
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="flex justify-end pt-6">
                <Button label="閉じる" @click="$emit('update:visible', false)" severity="secondary" text
                    class="px-6 py-2 rounded-xl font-bold !bg-transparent" />
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps({
    visible: Boolean,
    parentAccount: Object,
    subAccounts: {
        type: Array,
        default: () => []
    }
});

defineEmits(['update:visible', 'create', 'edit', 'delete']);

const sortedSubAccounts = computed(() => {
    return [...props.subAccounts].sort((a, b) => {
        if (a.display_order !== b.display_order) {
            return (a.display_order || 0) - (b.display_order || 0);
        }
        return a.id - b.id;
    });
});
</script>

<style scoped>
/* Dark Mode Component Fixes */
.dark :deep(.p-dialog-header),
.dark :deep(.p-dialog-content),
.dark :deep(.p-dialog-footer) {
    background: #1e293b;
    border-color: #334155;
    color: #f8fafc;
}
</style>
