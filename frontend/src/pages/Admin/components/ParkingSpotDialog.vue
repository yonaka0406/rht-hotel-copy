<template>
    <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" :style="{width: '450px'}" header="駐車場スポット詳細" :modal="true" class="p-fluid">
        <div class="field">
            <label for="spot_number">スポット番号</label>
            <InputText id="spot_number" v-model.trim="localSpot.spot_number" required="true" autofocus />
        </div>
        <div class="field">
            <label for="spot_type">スポットタイプ</label>
            <InputText id="spot_type" v-model.trim="localSpot.spot_type" />
        </div>
        <div class="field">
            <label for="capacity_units">容量ユニット</label>
            <InputNumber id="capacity_units" v-model="localSpot.capacity_units" integeronly />
        </div>
        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" class="p-button-text" @click="emit('update:visible', false)"/>
            <Button label="保存" icon="pi pi-check" class="p-button-text" @click="emit('save', localSpot)" />
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
    spot: Object,
});

const emit = defineEmits(['update:visible', 'save']);

const localSpot = ref({});

watch(() => props.spot, (newVal) => {
    localSpot.value = { ...newVal };
}, { immediate: true, deep: true });
</script>
