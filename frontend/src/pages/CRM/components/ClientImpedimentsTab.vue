<template>
    <div>
        <ConfirmDialog></ConfirmDialog>
        <div class="flex justify-end mb-4">
            <Button label="障害を追加" icon="pi pi-plus" @click="openAddImpedimentDialog" />
        </div>
        <DataTable :value="clientImpediments" :loading="loadingImpediments" responsiveLayout="scroll">
            <Column field="impediment_type" header="タイプ">
                <template #body="slotProps">
                    {{ impedimentTypeMap[slotProps.data.impediment_type] }}
                </template>
            </Column>
            <Column field="restriction_level" header="制限">
                <template #body="slotProps">
                    {{ restrictionLevelMap[slotProps.data.restriction_level] }}
                </template>
            </Column>
            <Column field="description" header="説明"></Column>
            <Column field="start_date" header="開始日">
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.start_date) }}
                </template>
            </Column>
            <Column field="end_date" header="終了日">
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.end_date) }}
                </template>
            </Column>
            <Column field="is_active" header="ステータス">
                <template #body="slotProps">
                    {{ slotProps.data.is_active ? '有効' : '無効' }}
                </template>
            </Column>
            <Column header="アクション">
                <template #body="slotProps">
                    <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2"
                        @click="openEditImpedimentDialog(slotProps.data)" aria-label="編集" v-tooltip="'編集'" />
                </template>
            </Column>
        </DataTable>

        <ImpedimentEditDialog 
            :visible="isDialogVisible" 
            :impedimentData="selectedImpediment"
            @update:visible="isDialogVisible = $event"
            @save="handleSave"
        />
    </div>
</template>

<script setup>
// Vue
import { ref, onMounted } from 'vue';

import { useRoute } from 'vue-router';
const route = useRoute();

//Primevue
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';

import { useToast } from 'primevue/usetoast';
const toast = useToast();

import ImpedimentEditDialog from './ImpedimentEditDialog.vue';

//Store
import { useCRMStore } from '@/composables/useCRMStore';
const { clientImpediments, loadingImpediments, fetchImpedimentsByClientId, createImpediment, updateImpediment } = useCRMStore();

const clientId = route.params.clientId;
const isDialogVisible = ref(false);
const selectedImpediment = ref(null);

const impedimentTypeMap = {
    payment: '支払い',
    behavioral: '行動',
    other: 'その他'
};

const restrictionLevelMap = {
    warning: '警告',
    block: 'ブロック'
};

const openAddImpedimentDialog = () => {
    selectedImpediment.value = { client_id: clientId, start_date: new Date(), is_active: true };
    isDialogVisible.value = true;
};

const openEditImpedimentDialog = (impediment) => {
    selectedImpediment.value = { ...impediment };
    isDialogVisible.value = true;
};

const handleSave = async (impediment) => {
    try {
        if (impediment.id) {
            await updateImpediment(impediment.id, impediment);
            toast.add({severity:'success', summary: '成功', detail:'障害が更新されました', life: 3000});
        } else {
            await createImpediment(impediment);
            toast.add({severity:'success', summary: '成功', detail:'障害が作成されました', life: 3000});
        }
        fetchImpedimentsByClientId(clientId); // Refresh list
    } catch (error) {
        toast.add({severity:'error', summary: 'エラー', detail: error.message, life: 3000});
    }
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
};

onMounted(() => {
    fetchImpedimentsByClientId(clientId);
});
</script>
