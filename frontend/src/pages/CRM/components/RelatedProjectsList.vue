<template>
    <div class="card">
        <h5 class="text-xl font-semibold mb-4">関連プロジェクト</h5>
        <div v-if="isLoadingRelatedProjects" class="flex justify-center items-center py-6">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s" />
        </div>
        <div v-else-if="relatedProjects.length === 0" class="text-center py-6">
            <p>このクライアントに関連するプロジェクトは見つかりませんでした。</p>
        </div>
        <DataTable v-else :value="relatedProjects" responsiveLayout="scroll" class="p-datatable-sm">
            <Column field="project_name" header="プロジェクト名" :sortable="true"></Column>
            <Column field="bid_date" header="入札日" :sortable="true">
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.bid_date) }}
                </template>
            </Column>
            <Column header="プロジェクト期間" :sortable="true">
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.start_date) || '-' }} - {{ formatDate(slotProps.data.end_date) || '-' }}
                </template>
            </Column>
            <Column header="あなたの役割">
                <template #body="slotProps">
                    <Tag :value="getRoleForCurrentClient(slotProps.data)" :severity="getRoleSeverity(getRoleForCurrentClient(slotProps.data))" />
                </template>
            </Column>
             <Column field="budget" header="予算" :sortable="true">
                <template #body="slotProps">
                    {{ formatCurrency(slotProps.data.budget) }}
                </template>
            </Column>            
        </DataTable>
    </div>
</template>

<script setup>
    // Vue
    import { onMounted, watch, toRefs } from 'vue';
    const props = defineProps({
        currentClientId: {
            type: String,
            required: true,
        }
    });

    // Stores
    import { useProjectStore } from '@/composables/useProjectStore';

    // Primevue
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';
    import ProgressSpinner from 'primevue/progressspinner';
    import Tag from 'primevue/tag';

    const { currentClientId: propsClientIdRef } = toRefs(props);

    const { relatedProjects, isLoadingRelatedProjects, fetchRelatedProjects } = useProjectStore();

    // Helpers
    const formatDate = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return dateString; // Return original if not a valid date
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };
    const formatCurrency = (value) => {
        if (value == null) return '-'; // Updated fallback
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
    };
    const getRoleForCurrentClient = (project) => {
        if (!project || !project.related_clients || !props.currentClientId) {
            return '-';
        }
        // Backend field is related_clients (JSONB array of objects)
        const clientEntry = project.related_clients.find(
            (rc) => rc.clientId === props.currentClientId || rc.clientid === props.currentClientId // Handle potential casing inconsistencies
        );
        return clientEntry ? clientEntry.role : '-';
    };
    const getRoleSeverity = (role) => {
        if (role === '元請業者') return 'success'; // Updated to Japanese
        if (role === '下請業者') return 'info';   // Updated to Japanese
        return 'warning'; // For '-' or other roles
    };

    const loadProjects = async () => {
        if (props.currentClientId) {
            //console.log(`RelatedProjectsList: Fetching projects for client ID: ${props.currentClientId}`);
            await fetchRelatedProjects(props.currentClientId);
        } else {
            //console.log('RelatedProjectsList: No currentClientId provided.');
            relatedProjects.value = []; // Clear if no client ID
        }
    };

    onMounted(() => {
        loadProjects();
    });

    watch(propsClientIdRef, (newClientId, oldClientId) => {
        if (newClientId !== oldClientId) {
            // console.log(`RelatedProjectsList: currentClientId changed from ${oldClientId} to ${newClientId}. Reloading projects.`);
            loadProjects();
        }
    }, { immediate: false });

    // Expose a method to allow parent to trigger refresh
    defineExpose({
        refreshProjects: loadProjects,
    });

</script>

<style scoped>    
    .p-datatable-sm :deep(.p-datatable-thead > tr > th) {
        padding: 0.5rem;
    }
    .p-datatable-sm :deep(.p-datatable-tbody > tr > td) {
        padding: 0.5rem;
    }
</style>
