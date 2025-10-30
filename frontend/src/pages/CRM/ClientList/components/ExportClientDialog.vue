<template>
    <Dialog
        class="dark:bg-gray-800 dark:text-gray-200"
        :visible="visible"
        @update:visible="closeDialog"
        header="顧客データのエクスポート"
        :closable="true"
        :modal="true"
        :style="{ width: '30vw' }"
    >
        <div class="grid grid-cols-1 gap-4 pt-4">
            <div class="col-span-1">
                <FloatLabel>
                    <DatePicker v-model="createdAfter" showIcon fluid />
                    <label>以降に作成された顧客</label>
                </FloatLabel>
            </div>
        </div>
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" @click="closeDialog" class="p-button-danger p-button-text p-button-sm" />
            <Button label="ダウンロード" icon="pi pi-download" @click="downloadClients" class="p-button-success p-button-text p-button-sm" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import { Dialog, Button, DatePicker, FloatLabel } from 'primevue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['close']);

const createdAfter = ref(null);

const closeDialog = () => {
    emit('close');
};

const downloadClients = () => {
  let url = '/api/clients/export';
  if (createdAfter.value) {
    url += `?created_after=${createdAfter.value.toISOString()}`;
  }
  window.open(url, '_blank');
  closeDialog();
};
</script>

<style scoped>
</style>