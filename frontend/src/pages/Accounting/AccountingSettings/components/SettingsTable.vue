<template>
    <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="border-b border-slate-100 dark:border-slate-700">
                    <th v-for="(header, index) in headers" :key="index"
                        :class="[
                            'py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest',
                            header.class || ''
                        ]"
                        :style="header.style">
                        {{ header.label || header }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <slot></slot>
                
                <tr v-if="items.length === 0">
                    <td :colspan="headers.length" class="py-12 text-center text-slate-400 font-medium">
                        {{ emptyMessage }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup>
defineProps({
    headers: {
        type: Array,
        required: true,
        // Accepts either strings or objects { label, class, style }
    },
    items: {
        type: Array,
        default: () => []
    },
    emptyMessage: {
        type: String,
        default: 'データがありません。'
    }
});
</script>