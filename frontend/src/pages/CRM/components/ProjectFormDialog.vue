<template>
    <div class="p-fluid"> <!-- Removed card class, h5 title. Dialog will provide chrome. -->
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
                        v-if="showHotelMultiSelect"
                        id="targetHotels"
                        key="hotel-multiselect-loaded"
                        v-model="selectedHotels"
                        :options="hotelList"
                        optionLabel="formal_name"
                        dataKey="id"
                        placeholder="店舗を選択 (複数可)"
                        display="chip"
                        class="w-full"
                        :loading="isLoadingHotelList.value"
                        :maxSelectedLabels="3"
                    />
                    <InputText
                        v-else-if="isLoadingHotelList.value"
                        id="targetHotelsLoading"
                        disabled
                        placeholder="ホテル情報を読込中..."
                        class="w-full"
                    />
                    <InputText
                        v-else
                        id="targetHotelsEmpty"
                        disabled
                        placeholder="利用可能なホテルがありません"
                        class="w-full"
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

        <div class="flex justify-end mt-6 gap-2">
            <Button label="キャンセル" icon="pi pi-times" @click="closeDialog" class="p-button-text" :disabled="isSubmitting"/>
            <Button :label="submitButtonLabel" :icon="submitButtonIcon" @click="handleSubmit" :loading="isSubmitting" />
        </div>
    </div>
</template>

<script setup>
    // Vue
    import { ref, computed, watch, onMounted } from 'vue';

    const props = defineProps({
        // isVisible prop removed as dialog visibility will be controlled by parent v-model:visible
        projectDataToEdit: {
            type: Object,
            default: null
        },
        currentClientId: { // Kept for now for defaulting prime contractor logic
            type: String,
            default: null,
        }
    });

    const emit = defineEmits(['close-dialog', 'project-saved']);

    // Stores
    import { useProjectStore } from '@/composables/useProjectStore';
    const { createProject, updateProject } = useProjectStore();
    import { useClientStore } from '@/composables/useClientStore';
    const clientStore = useClientStore();
    const { clients: allClientsList, fetchAllClientsForFiltering, getClientById } = clientStore;
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels: hotelList, isLoadingHotelList, fetchHotels } = useHotelStore();

    const mode = computed(() => props.projectDataToEdit && props.projectDataToEdit.id ? 'edit' : 'add');
    // Dialog title will be handled by parent. Button labels are dynamic:
    const submitButtonLabel = computed(() => mode.value === 'edit' ? '更新' : 'プロジェクト追加');
    const submitButtonIcon = computed(() => mode.value === 'edit' ? 'pi pi-check' : 'pi pi-plus');

    const showHotelMultiSelect = computed(() => {
        const list = hotelList.value;
        const isLoading = isLoadingHotelList.value;
        const hasLength = list ? list.length > 0 : false;

        console.log(
            '[ProjectAddForm] computed showHotelMultiSelect evaluating:',
            {
                isLoading: isLoading,
                hotelListIsTruthy: !!list,
                hotelListLength: list ? list.length : 'N/A',
                conditionResult: !isLoading && list && hasLength
            }
        );
        return !isLoading && list && hasLength;
    });

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

    // Helper to safely convert date strings to Date objects for DatePicker
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    };

    watch(() => [props.projectDataToEdit, allClientsList.value, hotelList.value], (values) => {
        const [newData, currentAllClients, currentHotelList] = values;
        // This watch triggers when projectDataToEdit, allClientsList, or hotelList changes.
        // This helps ensure that if master data (clients, hotels) loads after projectDataToEdit is set,
        // the form pre-filling logic correctly runs.

        if (mode.value === 'edit' && newData) {
            projectName.value = newData.project_name || '';
            bidDate.value = parseDate(newData.bid_date);
            orderSource.value = newData.order_source || '';
            projectLocation.value = newData.project_location || '';
            budget.value = newData.budget !== null ? Number(newData.budget) : 0;
            assignedWorkContent.value = newData.assigned_work_content || '';
            specificSpecializedWorkApplicable.value = newData.specific_specialized_work_applicable || false;
            startDate.value = parseDate(newData.start_date);
            endDate.value = parseDate(newData.end_date);

            // Hotels: Ensure currentHotelList is populated before mapping
            if (newData.target_store && Array.isArray(newData.target_store) && currentHotelList && currentHotelList.length > 0) {
                selectedHotels.value = newData.target_store
                    .map(tsHotel => currentHotelList.find(h => h.id === tsHotel.hotelId))
                    .filter(Boolean); // Only include hotels found in the master list
            } else {
                selectedHotels.value = [];
            }

            // Prime Contractor & Subcontractors: Ensure currentAllClients is populated
            if (newData.related_clients && Array.isArray(newData.related_clients) && currentAllClients && currentAllClients.length > 0) {
                const pcData = newData.related_clients.find(rc => rc.role === '元請業者');
                if (pcData) {
                    const client = currentAllClients.find(c => c.id === pcData.clientId);
                    primeContractor.value = client ? { ...client, preferred_display_name: client.name_kanji || client.name_kana || client.name || '' } : null;
                } else {
                    primeContractor.value = null;
                }

                subContractors.value = newData.related_clients
                    .filter(rc => rc.role === '下請業者')
                    .map(scData => {
                        const client = currentAllClients.find(c => c.id === scData.clientId);
                        return client ? { ...client, preferred_display_name: client.name_kanji || client.name_kana || client.name || '' } : null;
                    })
                    .filter(Boolean);
            } else {
                primeContractor.value = null;
                subContractors.value = [];
            }
        } else if (mode.value === 'add') {
            resetForm();
            // Default prime contractor if currentClientId is provided in add mode
            if (props.currentClientId && currentAllClients && currentAllClients.length > 0) {
                 const client = currentAllClients.find(c => c.id === props.currentClientId);
                 if (client) {
                      primeContractor.value = { ...client, preferred_display_name: client.name_kanji || client.name_kana || client.name || '' };
                 }
            }
        }
    }, { immediate: true, deep: true });

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
        projectName.value = '';
        bidDate.value = null;
        orderSource.value = '';
        projectLocation.value = '';
        selectedHotels.value = [];
        budget.value = 0; // Default to 0 as per previous change
        assignedWorkContent.value = '';
        specificSpecializedWorkApplicable.value = false;
        startDate.value = null;
        endDate.value = null;
        subContractors.value = [];
        projectNameError.value = '';

        // Handle primeContractor reset carefully based on currentClientId
        if (props.currentClientId && allClientsList.value?.length) {
             const client = allClientsList.value.find(c => c.id === props.currentClientId);
             if (client) {
                primeContractor.value = { ...client, preferred_display_name: client.name_kanji || client.name_kana || client.name || '' };
             } else {
                primeContractor.value = null;
             }
        } else {
            primeContractor.value = null;
        }
    };

    const closeDialog = () => {
        // It's good practice to reset form when dialog is explicitly closed,
        // especially if it might be reopened for a new "add" operation.
        // However, if just hiding, might not want to reset if user might reopen to continue editing.
        // For now, let's not reset here, rely on the watchEffect forisVisible=true & mode=add.
        emit('close-dialog');
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }
        isSubmitting.value = true;

        const relatedClientsPayload = [];
        if (primeContractor.value && primeContractor.value.id) {
            relatedClientsPayload.push({ clientId: primeContractor.value.id, role: '元請業者', responsibility: '' });
        }
        subContractors.value.forEach(client => {
            if (client && client.id) {
                relatedClientsPayload.push({ clientId: client.id, role: '下請業者', responsibility: '' });
            }
        });

        const projectPayload = {
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
            related_clients: relatedClientsPayload,
        };

        try {
            if (mode.value === 'add') {
                const newProject = await createProject(projectPayload);
                toast.add({ severity: 'success', summary: '成功', detail: `プロジェクト「${newProject.project_name}」が正常に作成されました。`, life: 3000 });
            } else if (mode.value === 'edit' && props.projectDataToEdit) {
                const updatedProject = await updateProject(props.projectDataToEdit.id, projectPayload);
                toast.add({ severity: 'success', summary: '成功', detail: `プロジェクト「${updatedProject.project_name}」が正常に更新されました。`, life: 3000 });
                // console.log('Update project called (placeholder):', props.projectDataToEdit.id, projectPayload);
                // toast.add({ severity: 'info', summary: 'お知らせ', detail: `プロジェクト更新処理 (ID: ${props.projectDataToEdit.id}) は未実装です。`, life: 3000 });
            }
            emit('project-saved');
            emit('close-dialog');
            // resetForm(); // Reset form after successful submission and dialog close
        } catch (error) {
            toast.add({ severity: 'error', summary: 'エラー', detail: error.message || `プロジェクトの${mode.value === 'add' ? '作成' : '更新'}に失敗しました。`, life: 5000 });
        } finally {
            isSubmitting.value = false;
        }
    };

    onMounted(async () => {
        // Fetch initial data required for the form, like hotel list or all clients list
        // This might be better handled if data is already available from parent or fetched conditionally
        if (!hotelList.value || hotelList.value.length === 0) {
           await fetchHotels();
        }
        if (!allClientsList.value || allClientsList.value.length === 0) {
           await fetchAllClientsForFiltering();
        }

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
