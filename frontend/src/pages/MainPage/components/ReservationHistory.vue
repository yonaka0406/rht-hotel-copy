<template>
    <Panel>
        <div v-if="loading" class="flex justify-center items-center p-6">
            <ProgressSpinner />
        </div>
        <Timeline v-else :value="reservationLog">
            <template #opposite="slotProps">
                <small class="text-surface-500 dark:text-surface-400">{{slotProps.item.date}}</small>
            </template>
            <template #content="slotProps">
                {{slotProps.item.status}}
            </template>
        </Timeline>
    </Panel>
</template>
<script setup>
    // Vue
    import { ref, onMounted } from 'vue';

    // Stores
    import { useLogStore } from '@/composables/useLogStore';
    const { reservationLog, fetchReservationHistory } = useLogStore();

    // Primevue
    import { Panel, Timeline, ProgressSpinner } from 'primevue';

    const props = defineProps({
        reservation_id: {
            type: String,
            required: true,
        },    
    });

    const loading = ref(false);

    onMounted(async () => {
        loading.value = true;

        await fetchReservationHistory(props.reservation_id);
        console.log('reservationLog:', reservationLog.value);

        loading.value = false;
    });

</script>