<template>
    <Dialog v-model:visible="dialogVisible" :style="{width: '450px'}" header="障害の詳細" :modal="true" class="p-fluid">
        <div class="field mb-6">
            <label for="is_active" class="block mb-2">ステータス</label>
            <ToggleSwitch v-model="impediment.is_active" class="mt-2" />
        </div>
        <div class="field mb-6">
            <label for="impediment_type" class="block mb-2">障害タイプ</label>
            <SelectButton id="impediment_type" v-model="impediment.impediment_type" :options="impedimentTypes" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="field mb-6">
            <label for="restriction_level" class="block mb-2">制限レベル</label>
            <SelectButton id="restriction_level" v-model="impediment.restriction_level" :options="restrictionLevels" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="field mb-6">
            <FloatLabel>
                <Textarea id="description" v-model="impediment.description" required="true" rows="3" class="w-full" />
                <label for="description">説明</label>
            </FloatLabel>
        </div>
        <div class="field mb-6">
            <FloatLabel>
                <DatePicker id="start_date" v-model="impediment.start_date" dateFormat="yy-mm-dd" showIcon class="w-full" />
                <label for="start_date">開始日</label>
            </FloatLabel>
        </div>
        <div class="field mb-6">
            <FloatLabel>
                <DatePicker id="end_date" v-model="impediment.end_date" dateFormat="yy-mm-dd" showIcon class="w-full" />
                <label for="end_date">終了日</label>
            </FloatLabel>
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
import FloatLabel from 'primevue/floatlabel';

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

<style scoped>
:deep(.p-float-label) {
    margin-top: 0.5rem;
}
:deep(.p-float-label label) {
    left: 1rem;
}
:deep(.p-float-label input:focus ~ label),
:deep(.p-float-label input.p-filled ~ label),
:deep(.p-float-label textarea:focus ~ label),
:deep(.p-float-label textarea.p-filled ~ label) {
    top: -0.75rem;
    background: var(--surface-card);
    padding: 0 0.5rem;
    left: 0.5rem;
    border-radius: 4px;
}

/* Add more space between fields */
.field {
    margin-bottom: 1.5rem;  /* 6 * 0.25rem = 1.5rem */
}
</style>
