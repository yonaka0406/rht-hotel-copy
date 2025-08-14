<template>
    <Dialog :visible="visible" @update:visible="handleDialogUpdate" :style="{ width: '450px' }" header="駐車場詳細"
        :modal="true" class="p-fluid">
        
        <span class="font-semibold">ホテル:</span> {{ hotelName }}
        
        <div class="field mt-8 mb-2">
            <FloatLabel>
                <InputText id="name" v-model.trim="localParkingLot.name" :class="{ 'p-invalid': nameError }"
                    class="w-full" autofocus @input="nameError = ''" />
                <label for="name" :class="{ 'p-error': nameError }">駐車場名</label>
            </FloatLabel>
            <small v-if="nameError" class="p-error">{{ nameError }}</small>
        </div>
        <div class="field mt-6 mb-2">
            <FloatLabel>
                <Textarea id="description" v-model="localParkingLot.description" rows="3" class="w-full" />
                <label for="description">説明</label>
            </FloatLabel>
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
import Textarea from 'primevue/textarea';
import FloatLabel from 'primevue/floatlabel';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    visible: Boolean,
    parkingLot: Object,
    hotelId: {
        type: [String, Number],
        required: true
    },
    hotelName: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['update:visible', 'save']);
const toast = useToast();

const localParkingLot = ref({ name: '', description: '', hotel_id: '' });
const nameError = ref('');

const validateForm = () => {
    let isValid = true;

    if (!localParkingLot.value.name?.trim()) {
        nameError.value = '駐車場名は必須です';
        isValid = false;
    }

    return isValid;
};

const handleSave = () => {
    if (validateForm()) {
        // Include hotel_id in the saved data
        const dataToSave = {
            ...localParkingLot.value,
            hotel_id: props.hotelId
        };
        emit('save', dataToSave);
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
    }
    emit('update:visible', value);
};

watch(() => props.parkingLot, (newVal) => {
    localParkingLot.value = { ...newVal };
    // Reset errors when parking lot changes
    nameError.value = '';
}, { immediate: true, deep: true });
</script>
