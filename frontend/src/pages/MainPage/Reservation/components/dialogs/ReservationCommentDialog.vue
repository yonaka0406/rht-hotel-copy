<template>
    <Dialog v-model:visible="dialogVisible" header="備考編集" :modal="true" :style="{ width: '50vw' }">
        <Textarea 
            v-model="localComment"
            :class="{ 
                'border-yellow-500 border-2': hasImportantComment,
                'border-orange-500': isDirty 
            }"
            class="w-full"
            rows="10"
        />
        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" @click="closeDialog" class="p-button-text" severity="secondary"/>
            <Button label="保存" icon="pi pi-check" @click="saveComment" class="p-button-text"/>
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { Dialog, Textarea, Button } from 'primevue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    comment: {
        type: String,
        default: '',
    },
    hasImportantComment: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:visible', 'save']);

const localComment = ref('');

const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value),
});

const isDirty = computed(() => localComment.value !== props.comment);

watch(() => props.comment, (newComment) => {
    console.log('[Dialog] Comment prop changed:', newComment);
    localComment.value = newComment;
}, { immediate: true });

onMounted(() => {
    console.log('[Dialog] Component mounted, comment prop:', props.comment);
    localComment.value = props.comment;
});

const closeDialog = () => {
    dialogVisible.value = false;
};

const saveComment = () => {
    emit('save', localComment.value);
    closeDialog();
};
</script>
