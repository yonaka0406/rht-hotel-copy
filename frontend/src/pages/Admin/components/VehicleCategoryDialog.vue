<template>
    <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" :style="{ width: '450px' }"
        header="車両カテゴリー詳細" :modal="true" class="p-fluid">
        <div class="field">
            <label for="name">カテゴリー名</label>
            <InputText id="name" v-model.trim="localCategory.name" required="true" autofocus />
        </div>
        <div class="field">
            <label for="capacity">必要ユニット</label>
            <InputNumber id="capacity" v-model="localCategory.capacity_units_required" integeronly />
        </div>
        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" class="p-button-text" @click="emit('update:visible', false)" />
            <Button label="保存" icon="pi pi-check" class="p-button-text" @click="emit('save', localCategory)" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';

const props = defineProps({
    visible: Boolean,
    category: Object,
});

const emit = defineEmits(['update:visible', 'save']);

const localCategory = ref({});

watch(() => props.category, (newVal) => {
    localCategory.value = { ...newVal };
}, { immediate: true, deep: true });
</script>
