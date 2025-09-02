<template>
    <Dialog v-model:visible="dialogVisible" :style="{width: '450px'}" header="障害の詳細" :modal="true" class="p-fluid">
        <div class="field mt-4">
            <label for="is_active">ステータス</label>
            <ToggleSwitch v-model="impediment.is_active" />
        </div>
        <div class="field mt-4">
            <label for="impediment_type">障害タイプ</label>
            <SelectButton v-model="impediment.impediment_type" :options="impedimentTypes" optionLabel="label" optionValue="value" />
        </div>
        <div class="field mt-4">
            <label for="restriction_level">制限レベル</label>
            <SelectButton v-model="impediment.restriction_level" :options="restrictionLevels" optionLabel="label" optionValue="value" />
        </div>
        <div class="field mt-4">
            <label for="description">説明</label>
            <Textarea id="description" v-model="impediment.description" required="true" rows="3" cols="20" />
        </div>
        <div class="field mt-4">
            <label for="start_date">開始日</label>
            <DatePicker id="start_date" v-model="impediment.start_date" dateFormat="yy-mm-dd" showIcon />
        </div>
        <div class="field mt-4">
            <label for="end_date">終了日</label>
            <DatePicker id="end_date" v-model="impediment.end_date" dateFormat="yy-mm-dd" showIcon />
        </div>

        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="hideDialog"/>
            <Button label="保存" icon="pi pi-check" class="p-button-sm" text @click="saveImpediment" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import ToggleSwitch from 'primevue/toggleswitch';

const props = defineProps({
    visible: Boolean,
    impedimentData: Object,
});

const emit = defineEmits(['update:visible', 'save']);

const dialogVisible = ref(props.visible);
const impediment = ref({});

const impedimentTypes = ref([
    {label: '支払い', value: 'payment'},
    {label: '行動', value: 'behavioral'},
    {label: 'その他', value: 'other'}
]);

const restrictionLevels = ref([
    {label: '警告', value: 'warning'},
    {label: 'ブロック', value: 'block'}
]);

watch(() => props.visible, (newValue) => {
    dialogVisible.value = newValue;
    if (newValue) {
        impediment.value = { ...props.impedimentData };
        if (impediment.value.start_date) {
            impediment.value.start_date = new Date(impediment.value.start_date);
        }
        if (impediment.value.end_date) {
            impediment.value.end_date = new Date(impediment.value.end_date);
        }
    }
});

watch(dialogVisible, (newValue) => {
    if (!newValue) {
        emit('update:visible', false);
    }
});

const hideDialog = () => {
    dialogVisible.value = false;
};

const saveImpediment = () => {
    emit('save', impediment.value);
    hideDialog();
};
</script>
