<template>
    <div class="p-fluid card">
        <h5 class="text-xl font-semibold mb-4">新規プロジェクト追加</h5>
        <div class="grid grid-cols-12 gap-4">
            <div class="field col-span-12 md:col-span-6">
                <FloatLabel class="mt-6">
                    <label for="projectName">プロジェクト名*</label>
                    <InputText id="projectName" v-model.trim="projectName" :class="{'p-invalid': projectNameError}" fluid />
                </FloatLabel>
                <small v-if="projectNameError" class="p-error">{{ projectNameError }}</small>
            </div>

            <div class="field col-span-12 md:col-span-6">
                <FloatLabel class="mt-6">
                    <label for="bidDate">入札日</label>
                    <DatePicker id="bidDate" v-model="bidDate" dateFormat="yy-mm-dd" showIcon fluid />
                </FloatLabel>
            </div>

            <div class="field col-span-12 md:col-span-6">
                <FloatLabel class="mt-6">
                    <label for="orderSource">発注元</label>
                    <InputText id="orderSource" v-model="orderSource" fluid />
                </FloatLabel>
            </div>

            <div class="field col-span-12 md:col-span-6">
                <FloatLabel class="mt-6">
                    <label for="projectLocation">工事場所</label>
                    <InputText id="projectLocation" v-model="projectLocation" fluid />
                </FloatLabel>
            </div>

            <div class="field col-span-12 md:col-span-6">
                <FloatLabel class="mt-6">
                    <label for="targetHotels">対象店舗</label>
                    <MultiSelect
                        id="targetHotels"
                        v-model="selectedHotels"
                        :options="hotelList.value || []"
                        optionLabel="formal_name"
                        dataKey="id"
                        placeholder="店舗を選択 (複数可)"
                        display="chip"
                        class="w-full" 
                        :loading="isLoadingHotelList.value"
                    />
                </FloatLabel>
            </div>

            <div class="field col-span-12 md:col-span-6">
                <FloatLabel class="mt-6">
                    <label for="budget">予算</label>
                    <InputNumber id="budget" v-model="budget" mode="currency" currency="JPY" locale="ja-JP" class="w-full" />
                </FloatLabel>
            </div>
            
            <div class="field col-span-12">
                <FloatLabel class="mt-6">
                    <label for="assignedWorkContent">作業内容</label>
                    <Textarea id="assignedWorkContent" v-model="assignedWorkContent" rows="3" fluid />
                </FloatLabel>
            </div>

            <!-- Row for Start Date, End Date, Specific Specialized Work -->
            <div class="field col-span-12 md:col-span-4">
                <FloatLabel class="mt-6">
                    <label for="startDate">開始日</label>
                    <DatePicker id="startDate" v-model="startDate" dateFormat="yy-mm-dd" showIcon fluid />
                </FloatLabel>
            </div>

            <div class="field col-span-12 md:col-span-4">
                <FloatLabel class="mt-6">
                    <label for="endDate">終了日</label>
                    <DatePicker id="endDate" v-model="endDate" dateFormat="yy-mm-dd" showIcon fluid />
                </FloatLabel>
            </div>

            <div class="field col-span-12 md:col-span-4">
                <div class="mt-6 flex items-center">
                    <Checkbox id="specificSpecializedWorkApplicable" v-model="specificSpecializedWorkApplicable" :binary="true" />
                    <label for="specificSpecializedWorkApplicable" class="ml-2">専門工事該当</label>
                </div>
            </div>

            <div class="field col-span-12 md:col-span-6">
                <FloatLabel class="mt-6">
                    <label for="primeContractor">元請業者</label>
                    <AutoComplete
                        id="primeContractor"
                        v-model="primeContractor"
                        :suggestions="primeContractorSuggestions"
                        @complete="onPrimeSearchLocal"
                        optionLabel="preferred_display_name"
                        placeholder="クライアントを検索"
                        forceSelection
                        fluid
                    >
                        <template #option="slotProps">
                            <div class="flex flex-col">
                                <div>{{ slotProps.option.preferred_display_name }}</div>
                                <small class="text-gray-500">{{ slotProps.option.name_kana }}</small>
                            </div>
                        </template>
                    </AutoComplete>
                </FloatLabel>
            </div>

            <div class="field col-span-12 md:col-span-6">
                <FloatLabel class="mt-6">
                    <label for="subContractors">下請業者</label>
                    <AutoComplete
                        id="subContractors"
                        v-model="subContractors"
                        :suggestions="subContractorSuggestions"
                        @complete="onSubSearchLocal"
                        optionLabel="preferred_display_name"
                        placeholder="クライアントを検索"
                        multiple
                        forceSelection
                        fluid
                    >
                        <template #option="slotProps">
                            <div class="flex flex-col">
                                <div>{{ slotProps.option.preferred_display_name }}</div>
                                <small class="text-gray-500">{{ slotProps.option.name_kana }}</small>
                            </div>
                        </template>
                    </AutoComplete>
                </FloatLabel>
            </div>
        </div>

        <div class="flex justify-end mt-4">
            <Button label="プロジェクト追加" icon="pi pi-plus" @click="handleAddProject" :loading="isSubmitting" />
        </div>
    </div>
</template>

<script setup>
    // Vue
    import { ref, reactive, computed, watch, getCurrentInstance, onMounted } from 'vue';
    
    const props = defineProps({
        currentClientId: {
            type: String,
            default: null,
        }
    });

    const emit = defineEmits(['project-added']);
    
    // Stores
    import { useProjectStore } from '@/composables/useProjectStore';
    const { createProject } = useProjectStore(); // Removed clientSearchResults, isLoadingClientSearch, searchClients
    import { useClientStore } from '@/composables/useClientStore';
    const clientStore = useClientStore(); // Instantiate
    const { clients: allClientsList, fetchClients: fetchAllClientsAction, getClientById } = clientStore; // Destructure
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels: hotelList, isLoadingHotelList, fetchHotels } = useHotelStore();

    // Primevue
    import InputText from 'primevue/inputtext';
    import MultiSelect from 'primevue/multiselect';
    import DatePicker from 'primevue/datepicker';
    import Textarea from 'primevue/textarea';
    import Checkbox from 'primevue/checkbox';
    import InputNumber from 'primevue/inputnumber';
    import AutoComplete from 'primevue/autocomplete';
    import Button from 'primevue/button';
    import FloatLabel from 'primevue/floatlabel';

    import { useToast } from 'primevue/usetoast';
    const toast = useToast();

    // Form state
    const bidDate = ref(null);
    const orderSource = ref('');
    const projectName = ref('');
    const projectLocation = ref('');
    const selectedHotels = ref([]);
    const budget = ref(0);
    const assignedWorkContent = ref('');
    const specificSpecializedWorkApplicable = ref(false);
    const startDate = ref(null);
    const endDate = ref(null);
    const primeContractor = ref(null);
    const subContractors = ref([]);

    const primeContractorSuggestions = ref([]);
    const subContractorSuggestions = ref([]);

    const isSubmitting = ref(false);
    const projectNameError = ref('');

    const onPrimeSearchLocal = (event) => {
        if (!event.query.trim().length) {
            primeContractorSuggestions.value = allClientsList.value?.map(client => ({
                ...client,
                preferred_display_name: client.name_kanji || client.name_kana || client.name || ''
            })) || [];
        } else {
            const query = event.query.toLowerCase();
            primeContractorSuggestions.value = allClientsList.value?.filter(client =>
                (client.name?.toLowerCase().includes(query)) ||
                (client.name_kana?.toLowerCase().includes(query)) ||
                (client.name_kanji?.toLowerCase().includes(query))
            ).map(client => ({
                ...client,
                preferred_display_name: client.name_kanji || client.name_kana || client.name || ''
            })) || [];
        }
    };

    const onSubSearchLocal = (event) => {
        if (!event.query.trim().length) {
            subContractorSuggestions.value = allClientsList.value?.map(client => ({
                ...client,
                preferred_display_name: client.name_kanji || client.name_kana || client.name || ''
            })) || [];
        } else {
            const query = event.query.toLowerCase();
            subContractorSuggestions.value = allClientsList.value?.filter(client =>
                (client.name?.toLowerCase().includes(query)) ||
                (client.name_kana?.toLowerCase().includes(query)) ||
                (client.name_kanji?.toLowerCase().includes(query))
            ).map(client => ({
                ...client,
                preferred_display_name: client.name_kanji || client.name_kana || client.name || ''
            })) || [];
        }
    };

    const validateForm = () => {
        projectNameError.value = '';
        if (!projectName.value) {
            projectNameError.value = 'プロジェクト名は必須です。';
            return false;
        }    
        return true;
    };

    const resetForm = () => {
        bidDate.value = null;
        orderSource.value = '';
        projectName.value = '';
        projectLocation.value = '';
        // targetStore.value = ''; // Removed
        selectedHotels.value = []; // Reset selectedHotels
        budget.value = 0;
        assignedWorkContent.value = '';
        specificSpecializedWorkApplicable.value = false;
        startDate.value = null;
        endDate.value = null;
        // primeContractor.value = null; // Keep default if set
        subContractors.value = [];
        projectNameError.value = '';

        // Reset prime contractor if not default
        if (props.currentClientId && primeContractor.value?.id !== props.currentClientId) {
            primeContractor.value = null;
        } else if (!props.currentClientId) {
            primeContractor.value = null;
        }
        // Re-fetch default prime contractor if currentClientId is set
        if (props.currentClientId) {
            getClientById(props.currentClientId).then(client => {
                if(client) primeContractor.value = client;
            }).catch(err => console.error("Error re-fetching default prime contractor:", err));
        }
    };

    const handleAddProject = async () => {
        if (!validateForm()) {
            return;
        }
        isSubmitting.value = true;

        const relatedClients = [];
        if (primeContractor.value && primeContractor.value.id) {
            relatedClients.push({ clientId: primeContractor.value.id, role: '元請業者', responsibility: '' });
        }
        subContractors.value.forEach(client => {
            if (client && client.id) {
                relatedClients.push({ clientId: client.id, role: '下請業者', responsibility: '' });
            }
        });

        const projectData = {
            bid_date: bidDate.value ? new Date(bidDate.value).toISOString().split('T')[0] : null,
            order_source: orderSource.value,
            project_name: projectName.value,
            project_location: projectLocation.value,
            target_store: selectedHotels.value.map(hotel => ({ hotelId: hotel.id, formal_name: hotel.formal_name })),
            budget: budget.value,
            assigned_work_content: assignedWorkContent.value,
            specific_specialized_work_applicable: specificSpecializedWorkApplicable.value,
            start_date: startDate.value ? new Date(startDate.value).toISOString().split('T')[0] : null,
            end_date: endDate.value ? new Date(endDate.value).toISOString().split('T')[0] : null,
            related_clients: relatedClients,        
        };

        try {
            const newProject = await createProject(projectData);
            if (toast) {
                toast.add({ severity: 'success', summary: '成功', detail: `プロジェクト「${newProject.project_name}」が正常に作成されました。`, life: 3000 });
            } else {
                console.log('Project created successfully:', newProject);
            }
            resetForm();
            emit('project-added', newProject); 
        } catch (error) {
            if (toast) {
                toast.add({ severity: 'error', summary: 'エラー', detail: error.message || 'プロジェクトの作成に失敗しました。', life: 3000 });
            } else {
                console.error('Failed to create project:', error.message);
            }
        } finally {
            isSubmitting.value = false;
        }
    };

    onMounted(async () => { 
        await fetchHotels();
        await fetchAllClientsAction(); // Fetch all clients
        console.log('[ProjectAddForm] isLoadingHotelList after fetch:', isLoadingHotelList.value);
        console.log('[ProjectAddForm] hotelList.value after fetch:', hotelList.value);
        if (hotelList.value && hotelList.value.length > 0) {
            console.log('[ProjectAddForm] Sample hotel object (hotelList.value[0]):', hotelList.value[0]);
            console.log('[ProjectAddForm] Does sample hotel have formal_name?:', hotelList.value[0]?.formal_name !== undefined);
        } else {
            console.log('[ProjectAddForm] hotelList.value is empty or not an array after fetch.');
        }
        // Initialize suggestions for empty query state if needed, or let AutoComplete handle it.
        // onPrimeSearchLocal({ query: '' });
        // onSubSearchLocal({ query: '' });
    });

    watch(() => props.currentClientId, async (newVal) => {
        if (newVal) {
            try {
                const client = await getClientById(newVal);
                if (client) {
                    primeContractor.value = {
                        ...client,
                        preferred_display_name: client.name_kanji || client.name_kana || client.name || ''
                    };
                }
            } catch (error) {
                console.error("Error fetching default prime contractor:", error);
            }
        }
    }, { immediate: true });

</script>

<style scoped>
    .field {
        margin-bottom: 1rem;
    }
</style>
