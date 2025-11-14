<template>
    <div class="flex justify-end p-3">
        <Button label="さらに月を追加" icon="pi pi-plus" @click="addMonths" :loading="loading" />
    </div>
</template>

<script setup>
import Button from 'primevue/button';

const props = defineProps({
    loading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['addMonths']);

const addMonths = () => {
    emit('addMonths');
};
</script>

<style scoped>
/* Add any specific styles for this footer component here if needed */
</style>
