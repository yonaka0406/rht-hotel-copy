<script setup>
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ReservationEdit from '@/pages/MainPage/Reservation/ReservationEdit.vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    reservationId: {
        type: String,
        default: null
    }
});

const emit = defineEmits(['update:visible', 'open-in-new-tab']);

const isVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
});

const openInNewTab = () => {
    if (props.reservationId) {
        emit('open-in-new-tab', props.reservationId);
    }
};
</script>

<template>
    <Dialog v-model:visible="isVisible" modal header="予約編集" :style="{ width: '90vw', maxWidth: '1200px' }" class="p-0">
        <div class="h-[80vh] overflow-y-auto">
            <ReservationEdit :reservation_id="reservationId" v-if="reservationId" />
        </div>
        <template #footer>
            <div class="flex justify-between items-center w-full px-4 pb-4">
                <button @click="openInNewTab"
                    class="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 text-violet-600 border border-violet-200 dark:border-violet-700 rounded-xl font-bold hover:bg-violet-50 dark:hover:bg-violet-900/50 transition-all cursor-pointer">
                    <i class="pi pi-external-link"></i>
                    <span>別タブで開く</span>
                </button>
                <button @click="isVisible = false"
                    class="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer">
                    閉じる
                </button>
            </div>
        </template>
    </Dialog>
</template>
