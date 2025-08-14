<template>
    <Dialog :visible="visible" @update:visible="handleDialogUpdate" :style="{ width: '450px' }" header="車両カテゴリー詳細"
        :modal="true" class="p-fluid">
        <div class="field mt-6 mb-2">
            <FloatLabel>
                <InputText id="name" v-model.trim="localCategory.name" :class="{ 'p-invalid': nameError }"
                    class="w-full" autofocus @input="nameError = ''" />
                <label for="name" :class="{ 'p-error': nameError }">カテゴリー名</label>
            </FloatLabel>
            <small v-if="nameError" class="p-error">{{ nameError }}</small>
        </div>
        <div class="field mt-6 mb-2">
            <FloatLabel>
                <InputNumber id="capacity" v-model="localCategory.capacity_units_required" :min="1" integeronly
                    :class="{ 'p-invalid': unitsError }" class="w-full" @input="unitsError = ''" />
                <label for="capacity" :class="{ 'p-error': unitsError }">必要ユニット</label>
            </FloatLabel>
            <small v-if="unitsError" class="p-error">{{ unitsError }}</small>
            <small class="text-500 block mt-2">ユニット = 幅 m × 長さ m × 8<br>(例: 100 ユニット = 幅2.5m × 長さ5.0m)</small>
        </div>
        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" class="p-button-text p-button-sm p-button-danger"
                @click="handleDialogUpdate(false)" />
            <Button label="保存" icon="pi pi-check" class="p-button-text p-button-sm" @click="handleSave" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import FloatLabel from 'primevue/floatlabel';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    visible: Boolean,
    category: Object,
});

const emit = defineEmits(['update:visible', 'save']);
const toast = useToast();

const localCategory = ref({ name: '', capacity_units_required: 100 });
const nameError = ref('');
const unitsError = ref('');

const validateForm = () => {
    let isValid = true;

    if (!localCategory.value.name?.trim()) {
        nameError.value = 'カテゴリー名は必須です';
        isValid = false;
    }

    if (!localCategory.value.capacity_units_required || localCategory.value.capacity_units_required < 1) {
        unitsError.value = '有効なユニット数を入力してください';
        isValid = false;
    }

    return isValid;
};

const handleSave = () => {
    if (validateForm()) {
        emit('save', localCategory.value);
    } else {
        toast.add({
            severity: 'error',
            summary: '入力エラー',
            detail: '必須フィールドを確認してください',
            life: 3000
        });
    }
};

const handleDialogUpdate = (value) => {
    if (!value) {
        // Reset errors when closing
        nameError.value = '';
        unitsError.value = '';
    }
    emit('update:visible', value);
};

watch(() => props.category, (newVal) => {
    localCategory.value = { ...newVal };
    // Reset errors when category changes
    nameError.value = '';
    unitsError.value = '';
}, { immediate: true, deep: true });
</script>
