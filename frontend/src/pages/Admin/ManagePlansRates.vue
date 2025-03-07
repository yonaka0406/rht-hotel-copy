<template>
    <div v-if="plan">
        <div class="flex gap-4 mb-4">
            <div class="p-4 shadow-lg rounded-lg w-1/3 bg-white">
                <h3 class="text-xl font-semibold">日付を選択:</h3>
                <DatePicker v-model="selectedDate" 
                    :showIcon="true" 
                    iconDisplay="input" 
                    :selectOtherMonths="true"                 
                    fluid
                    dateFormat="yy-mm-dd" 
                />
            </div>
            <div class="p-4 shadow-lg rounded-lg w-1/3 bg-white">
                <h3 class="text-xl font-semibold">現在の基本料金:</h3>
                <div>
                    <p v-if="filteredBaseRateSum !== null">
                        基本料金合計: {{ formatNumber(filteredBaseRateSum, 'currency') }}
                    </p>
                    <p v-else>選択した日付の基本料金が見つかりません。</p>
                </div>
            </div>
            <div class="p-4 shadow-lg rounded-lg w-full md:w-1/3 bg-white mb-4">
                <h3 class="text-xl font-semibold">現在の定額料金調整:</h3>
                <div>
                    <p v-if="filteredFlatFeeSum !== null">
                        定額料金合計: {{ formatNumber(filteredFlatFeeSum, 'currency') }}
                    </p>
                    <p v-else>選択した日付の定額料金調整が見つかりません。</p>
                </div>
            </div>
        </div>
        <div class="flex gap-4">
            <div class="p-4 shadow-lg rounded-lg w-full md:w-1/3 bg-white mb-4">
                <h3 class="text-xl font-semibold">現在のパーセント調整:</h3>
                <div>
                    <p v-if="filteredPercentageSum !== null">
                    合計パーセント: {{ formatNumber(filteredPercentageSum, 'decimal') }}%
                    </p>
                    <p v-else>選択した日付のパーセント調整が見つかりません。</p>
                </div>
            </div>
            <div class="p-4 shadow-lg rounded-lg w-full md:w-1/3 bg-white mb-4">
                <h3 class="text-xl font-semibold">現在のアドオン:</h3>
                <div>                    
                    <p>カウント: {{ filteredAddonCount }}</p>
                    <p>料金合計: {{ formatNumber(filteredAddonSum, 'currency') }}</p>                    
                </div>
            </div>
        </div>

        <div>
            <div class="grid xs:grid-cols-1 grid-cols-3 gap-2 mt-6">
                <div class="flex justify-start">
                    <span class="font-bold text-lg">条件</span>
                </div>                  
                <div class="flex justify-start">
                    <Button @click="openAdjustmentDialog" label="新規調整" icon="pi pi-plus" />
                </div>
            </div>
            <Accordion value="0">
                <AccordionPanel value="0">
                    <AccordionHeader>現在の条件</AccordionHeader>
                    <AccordionContent>                        
                        <DataTable :value="filteredCurrentConditions">
                            <Column field="date_start" header="開始"></Column>
                            <Column field="date_end" header="終了"></Column>    
                            <Column header="料金">
                                <template #body="slotProps">
                                    <div v-if="slotProps.data.adjustment_type !== 'percentage'">
                                        {{ formatNumber(slotProps.data.adjustment_value, 'currency') }}
                                    </div>
                                    <div v-else>
                                        {{ formatNumber(slotProps.data.adjustment_value, 'decimal') }}%
                                    </div>
                                    <div v-if="slotProps.data.adjustment_type === 'base_rate'">
                                        <Badge value="基本料金"
                                            severity="secondary">
                                        </Badge>
                                    </div>
                                    <div v-if="slotProps.data.adjustment_type === 'flat_fee'">
                                        <Badge value="定額料金"
                                            severity="info">
                                        </Badge>
                                    </div>
                                    <div v-if="slotProps.data.adjustment_type === 'percentage'">
                                        <Badge value="パーセント"
                                            severity="warn">
                                        </Badge>
                                    </div>
                                    
                                </template>
                            </Column>
                            <Column header="条件">
                                <template #body="slotProps">
                                    <div v-if="slotProps.data.condition_type === 'day_of_week'">                                        
                                        <Badge 
                                            v-for="(day, index) in daysOfWeek"
                                            :key="index"
                                            :value="day.label"
                                            :class="{'p-badge-success': slotProps.data.condition_value.includes(day.value.toLowerCase()), 'p-badge-secondary': !slotProps.data.condition_value.includes(day.value.toLowerCase())}"
                                            class="p-m-1"
                                        />
                                    </div>
                                    <div v-else-if="slotProps.data.condition_type === 'month'">                                        
                                        <Badge 
                                            v-for="(month, index) in months" 
                                            :key="index"
                                            :value="month.label"
                                            :class="{'p-badge-success': slotProps.data.condition_value.includes(month.value.toLowerCase()), 'p-badge-secondary': !slotProps.data.condition_value.includes(month.value.toLowerCase())}"
                                            class="p-m-1"
                                        />
                                    </div>
                                </template>
                            </Column>
                            <Column header="操作">
                                <template #body="slotProps">
                                    <Button 
                                        icon="pi pi-pencil"
                                        class="p-button-text p-button-sm"
                                        @click="openEditAdjustmentDialog(slotProps.data)"
                                    />                                  
                                </template>
                            </Column>
                        </DataTable>
                    </AccordionContent>
                </AccordionPanel>
                <AccordionPanel value="1">
                    <AccordionHeader>将来の条件</AccordionHeader>
                    <AccordionContent>
                        <DataTable :value="filteredFutureConditions">
                            <Column field="date_start" header="開始"></Column>
                            <Column field="date_end" header="終了"></Column>    
                            <Column header="Rate">
                                <template #body="slotProps">
                                    <div v-if="slotProps.data.adjustment_type !== 'percentage'">
                                        {{ formatNumber(slotProps.data.adjustment_value, 'currency') }}
                                    </div>
                                    <div v-else>
                                        {{ formatNumber(slotProps.data.adjustment_value, 'decimal') }}%
                                    </div>
                                    <div v-if="slotProps.data.adjustment_type === 'base_rate'">
                                        <Badge value="基本料金"
                                            severity="secondary">
                                        </Badge>
                                    </div>
                                    <div v-if="slotProps.data.adjustment_type === 'flat_fee'">
                                        <Badge value="定額料金"
                                            severity="info">
                                        </Badge>
                                    </div>
                                    <div v-if="slotProps.data.adjustment_type === 'percentage'">
                                        <Badge value="パーセント"
                                            severity="warn">
                                        </Badge>
                                    </div>
                                    
                                </template>
                            </Column>
                            <Column header="条件">
                                <template #body="slotProps">
                                    <div v-if="slotProps.data.condition_type === 'day_of_week'">                                        
                                        <Badge 
                                            v-for="(day, index) in daysOfWeek"
                                            :key="index"
                                            :value="day.label"
                                            :class="{'p-badge-success': slotProps.data.condition_value.includes(day.value.toLowerCase()), 'p-badge-secondary': !slotProps.data.condition_value.includes(day.value.toLowerCase())}"
                                            class="p-m-1"
                                        />
                                    </div>
                                    <div v-else-if="slotProps.data.condition_type === 'month'">                                        
                                        <Badge 
                                            v-for="(month, index) in months" 
                                            :key="index"
                                            :value="month.label"
                                            :class="{'p-badge-success': slotProps.data.condition_value.includes(month.value.toLowerCase()), 'p-badge-secondary': !slotProps.data.condition_value.includes(month.value.toLowerCase())}"
                                            class="p-m-1"
                                        />
                                    </div>
                                </template>
                            </Column>
                            <Column header="操作">
                                <template #body="slotProps">
                                    <Button 
                                        icon="pi pi-pencil"
                                        class="p-button-text p-button-sm"
                                        @click="openEditAdjustmentDialog(slotProps.data)"
                                    />                                  
                                </template>
                            </Column>    
                        </DataTable>
                    </AccordionContent>
                </AccordionPanel>
                <AccordionPanel value="2">
                    <AccordionHeader>過去の条件</AccordionHeader>
                    <AccordionContent>                        
                        <DataTable :value="filteredPastConditions">
                            <Column field="date_start" header="開始"></Column>
                            <Column field="date_end" header="終了"></Column>    
                            <Column header="Rate">
                                <template #body="slotProps">
                                    <div v-if="slotProps.data.adjustment_type !== 'percentage'">
                                        {{ formatNumber(slotProps.data.adjustment_value, 'currency') }}
                                    </div>
                                    <div v-else>
                                        {{ formatNumber(slotProps.data.adjustment_value, 'decimal') }}%
                                    </div>
                                    <div v-if="slotProps.data.adjustment_type === 'base_rate'">
                                        <Badge value="基本料金"
                                            severity="secondary">
                                        </Badge>
                                    </div>
                                    <div v-if="slotProps.data.adjustment_type === 'flat_fee'">
                                        <Badge value="定額料金"
                                            severity="info">
                                        </Badge>
                                    </div>
                                    <div v-if="slotProps.data.adjustment_type === 'percentage'">
                                        <Badge value="パーセント"
                                            severity="warn">
                                        </Badge>
                                    </div>
                                    
                                </template>
                            </Column>
                            <Column header="条件">
                                <template #body="slotProps">
                                    <div v-if="slotProps.data.condition_type === 'day_of_week'">                                        
                                        <Badge 
                                            v-for="(day, index) in daysOfWeek"
                                            :key="index"
                                            :value="day.label"
                                            :class="{'p-badge-success': slotProps.data.condition_value.includes(day.value.toLowerCase()), 'p-badge-secondary': !slotProps.data.condition_value.includes(day.value.toLowerCase())}"
                                            class="p-m-1"
                                        />
                                    </div>
                                    <div v-else-if="slotProps.data.condition_type === 'month'">                                        
                                        <Badge 
                                            v-for="(month, index) in months" 
                                            :key="index"
                                            :value="month.label"
                                            :class="{'p-badge-success': slotProps.data.condition_value.includes(month.value.toLowerCase()), 'p-badge-secondary': !slotProps.data.condition_value.includes(month.value.toLowerCase())}"
                                            class="p-m-1"
                                        />
                                    </div>
                                </template>
                            </Column>   
                            <Column header="操作">
                                <template #body="slotProps">
                                    <Button 
                                        icon="pi pi-pencil"
                                        class="p-button-text p-button-sm"
                                        @click="openEditAdjustmentDialog(slotProps.data)"
                                    />                                  
                                </template>
                            </Column>                     
                        </DataTable>
                    </AccordionContent>
                </AccordionPanel>
            </Accordion>
        </div>

        <div>
            <ManagePlansAddons :plan="planId" @update-filtered-conditions="handleFilteredAddons" />
        </div>
        
        <Dialog header="新規調整" v-model:visible="showAdjustmentDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
            <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 gap-y-6 pt-6">
                <div class="col-6">
                    <FloatLabel>
                        <label for="adjustmentType">調整種類 *</label>
                        <Select v-model="newAdjustment.adjustment_type" 
                            :options="adjustmentTypes" 
                            optionLabel="label" 
                            optionValue="value" 
                            fluid 
                            required />
                    </FloatLabel>
                </div>
                <div class="col-6">
                    <FloatLabel>
                        <label for="conditionType">条件区分 *</label>
                        <Select v-model="newAdjustment.condition_type" 
                            :options="conditionTypes" 
                            optionLabel="label" 
                            optionValue="value" 
                            class="w-full"
                            @change="updateConditionValues" 
                            required 
                        />
                    </FloatLabel>
                </div>
                <div class="col-6">
                    <FloatLabel>
                        <label for="adjustmentValue">調整値 *</label>
                        <div v-if="newAdjustment.adjustment_type !== 'percentage'">
                            <InputNumber v-model="newAdjustment.adjustment_value" 
                                mode="currency" 
                                currency="JPY" 
                                locale="ja-JP" 
                                class="w-full"
                                required 
                            />

                        </div>
                        <div v-else>
                            <InputNumber v-model="newAdjustment.adjustment_value" 
                                :minFractionDigits="2"
                                :maxFractionDigits="2"
                                suffix="%"
                                class="w-full"
                                required 
                            />
                        </div>                        
                    </FloatLabel>                
                </div>
                <div class="col-6">                    
                    <FloatLabel>
                        <label for="conditionValue">条件</label>
                        <MultiSelect v-model="newAdjustment.condition_value" 
                            placeholder="Condition Value"
                            :options="conditionValues" 
                            optionLabel="label" 
                            optionValue="value"
                            :maxSelectedLabels="3"
                            fluid
                        />
                    </FloatLabel>
                </div>
                <div class="col-6">
                    <FloatLabel>
                        <label for="dateStart">開始日</label>                
                        <DatePicker v-model="newAdjustment.date_start" 
                            :showIcon="true" 
                            iconDisplay="input" 
                            dateFormat="yy-mm-dd"
                            :selectOtherMonths="true"                 
                            fluid
                            required 
                        />
                    </FloatLabel>                
                </div>
                <div class="col-6">
                    <FloatLabel>
                        <label for="dateEnd">終了日</label>
                        <DatePicker v-model="newAdjustment.date_end"
                            :showIcon="true" 
                            iconDisplay="input" 
                            dateFormat="yy-mm-dd"
                            :selectOtherMonths="true"                 
                            fluid
                        />
                    </FloatLabel>                
                </div>
            </div>
            <template #footer>
                <Button label="保存" icon="pi pi-check" @click="saveAdjustment" class="p-button-success" />
                <Button label="キャンセル" icon="pi pi-times" @click="showAdjustmentDialog = false" class="p-button-danger" />
            </template>
        </Dialog>

        <Dialog header="調整編集" v-model:visible="showEditAdjustmentDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
            <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 gap-y-6 pt-6">
                <div class="col-6">
                    <FloatLabel>
                        <label for="adjustmentType">調整種類 *</label>
                        <Select v-model="editAdjustment.adjustment_type" 
                            :options="adjustmentTypes" 
                            optionLabel="label" 
                            optionValue="value" 
                            fluid 
                            required />
                    </FloatLabel>
                </div>
                <div class="col-6">
                    <FloatLabel>
                        <label for="conditionType">条件区分 *</label>
                        <Select v-model="editAdjustment.condition_type" 
                            :options="conditionTypes" 
                            optionLabel="label" 
                            optionValue="value" 
                            class="w-full"
                            @change="updateEditConditionValues" 
                            required 
                        />
                    </FloatLabel>
                </div>
                <div class="col-6">
                    <FloatLabel>
                        <label for="adjustmentValue">調整値 *</label>
                        <div v-if="editAdjustment.adjustment_type !== 'percentage'">
                            <InputNumber v-model="editAdjustment.adjustment_value" 
                                mode="currency" 
                                currency="JPY" 
                                locale="ja-JP" 
                                class="w-full"
                                required 
                            />
                        </div>
                        <div v-else>
                            <InputNumber v-model="editAdjustment.adjustment_value" 
                                :minFractionDigits="2"
                                :maxFractionDigits="2"
                                suffix="%"
                                class="w-full"
                                required 
                            />
                        </div>                        
                    </FloatLabel>                
                </div>                
                <div class="col-6">                    
                    <FloatLabel>
                        <label for="conditionValue">条件</label>
                        <MultiSelect  
                            v-model="selectedEditConditions"                            
                            :options="conditionValues" 
                            optionLabel="label" 
                            optionValue="value"
                            :maxSelectedLabels="3"
                            class="w-full"
                        />
                    </FloatLabel>
                </div>
                <div class="col-6">
                    <FloatLabel>
                        <label for="dateStart">開始日</label>                
                        <DatePicker v-model="editAdjustment.date_start" 
                            :showIcon="true" 
                            iconDisplay="input" 
                            dateFormat="yy-mm-dd"
                            :selectOtherMonths="true"                 
                            fluid
                            required 
                        />
                    </FloatLabel>                
                </div>
                <div class="col-6">
                    <FloatLabel>
                        <label for="dateEnd">終了日</label>
                        <DatePicker v-model="editAdjustment.date_end"
                            :showIcon="true" 
                            iconDisplay="input"     
                            dateFormat="yy-mm-dd"
                            :selectOtherMonths="true"                 
                            fluid
                        />
                    </FloatLabel>                
                </div>
            </div>
            <template #footer>
                <Button label="更新" icon="pi pi-check" @click="updateAdjustment" class="p-button-success" />
                <Button label="キャンセル" icon="pi pi-times" @click="showEditAdjustmentDialog = false" class="p-button-danger" />
            </template>
        </Dialog>

    </div>
</template>
  
<script>
    import { ref, watch, computed, onMounted } from 'vue';
    import { useToast } from 'primevue/usetoast';

    import ManagePlansAddons from './ManagePlansAddons.vue';

    import Button from 'primevue/button';
    import Dialog from 'primevue/dialog';
    import InputNumber from 'primevue/inputnumber';
    import InputText from 'primevue/inputtext';
    import Select from 'primevue/select';
    import MultiSelect from 'primevue/multiselect'
    import DatePicker from 'primevue/datepicker';
    import FloatLabel from 'primevue/floatlabel';
    import Accordion from 'primevue/accordion';
    import AccordionPanel from 'primevue/accordionpanel';
    import AccordionHeader from 'primevue/accordionheader';
    import AccordionContent from 'primevue/accordioncontent';
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';
    import Badge from 'primevue/badge';

    export default {
        name: 'ManagePlanRate',
        props: {
        plan: {
                type: Object,
                required: true,
            },
        },
        data() {
            return {
                addons: []
            };
        },
        components: {
            ManagePlansAddons,
            Button,
            Dialog,
            InputNumber,
            InputText,
            Select,
            MultiSelect,
            DatePicker,
            FloatLabel,
            Accordion,
            AccordionPanel,
            AccordionHeader,
            AccordionContent,
            DataTable,
            Column,
            Badge,
        },
        setup(props) {
            const toast = useToast();
            const selectedDate = ref(new Date().toISOString().split('T')[0]);
            const planId = ref({                
                plans_global_id: props.plan.context === 'global' ? props.plan.id : 0,
                plans_hotel_id: props.plan.context === 'hotel' ? props.plan.id : 0,
                hotel_id: props.plan.context === 'hotel' ? props.plan.hotel_id : 0, 
                date: selectedDate,
            });            
            const allRates = ref([]);            
            const showAdjustmentDialog = ref(false);
            const showEditAdjustmentDialog = ref(false);
            const selectedEditConditions = ref([]);            
            const newAdjustment = ref({
                hotel_id: null,
                plans_global_id: null,
                plans_hotel_id: null,
                adjustment_type: 'base_rate',
                adjustment_value: 0,
                condition_type: 'no_restriction',
                condition_value: [],
                date_start: new Date().toISOString().split('T')[0],
                date_end: null,
            });
            const editAdjustment = ref({
                hotel_id: null,
                plans_global_id: null,
                plans_hotel_id: null,
                adjustment_type: 'base_rate',
                adjustment_value: 0,
                condition_type: 'no_restriction',
                condition_value: [],
                date_start: new Date().toISOString().split('T')[0],
                date_end: null,
            });            
            const adjustmentTypes = [
                { label: '基本料金', value: 'base_rate' },
                { label: 'パーセント', value: 'パーセント' },
                { label: '定額料金', value: 'flat_fee' },
            ];
            const conditionTypes = [
                { label: '条件なし', value: 'no_restriction' },
                { label: '曜日毎', value: 'day_of_week' },
                { label: '月毎', value: 'month' },
            ];
            const conditionValues = ref([]);
            const filteredCurrentAddons = ref([]);

            const daysOfWeek = [
                { label: '月曜日', value: 'mon' },
                { label: '火曜日', value: 'tue' },
                { label: '水曜日', value: 'wed' },
                { label: '木曜日', value: 'thu' },
                { label: '金曜日', value: 'fri' },
                { label: '土曜日', value: 'sat' },
                { label: '日曜日', value: 'sun' }
            ];

            const months = [
                { label: '１月', value: 'january' },
                { label: '２月', value: 'february' },
                { label: '３月', value: 'march' },
                { label: '４月', value: 'april' },
                { label: '５月', value: 'may' },
                { label: '６月', value: 'june' },
                { label: '７月', value: 'july' },
                { label: '８月', value: 'august' },
                { label: '９月', value: 'september' },
                { label: '１０月', value: 'october' },
                { label: '１１月', value: 'november' },
                { label: '１２月', value: 'december' }
            ];            

            const fetchRates = async () => {
                // Helper function to format the date
                const formatDate = (date) => {
                    if (!date) return null; // Handle null values
                    const d = new Date(date);
                    const yy = String(d.getFullYear()); 
                    const mm = String(d.getMonth() + 1).padStart(2, '0'); // Month (01-12)
                    const dd = String(d.getDate()).padStart(2, '0'); // Day (01-31)
                    return `${yy}-${mm}-${dd}`;
                };

                try {
                    const authToken = localStorage.getItem('authToken');
                    const response = await fetch(`/api/plans/${planId.value.plans_global_id}/${planId.value.plans_hotel_id}/${planId.value.hotel_id}/rates`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        }                        
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch rates');
                    }

                    const data = await response.json();
                    allRates.value = data.map(rate => ({
                        ...rate,
                        date_start: formatDate(rate.date_start),
                        date_end: formatDate(rate.date_end)
                    }));
                } catch (error) {
                    console.error('Error fetching rates:', error);
                }
            };

            const openAdjustmentDialog = () => {
                if (props.plan.context === 'global') {
                    newAdjustment.value.plans_global_id = props.plan.id;
                    newAdjustment.value.plans_hotel_id = null;
                } else if (props.plan.context === 'hotel') {
                    newAdjustment.value.plans_global_id = null;
                    newAdjustment.value.plans_hotel_id = props.plan.id;
                    newAdjustment.value.hotel_id = props.plan.hotel_id;
                }
                showAdjustmentDialog.value = true;
            };

            const openEditAdjustmentDialog = (adjustmentData) => {
                // Populate the editAdjustment with the selected row data
                editAdjustment.value = { ...adjustmentData };

                updateEditConditionValues();
                showEditAdjustmentDialog.value = true; // Open the dialog
            };

            const updateConditionValues = () => {
                if (newAdjustment.value.condition_type === 'day_of_week') {
                    conditionValues.value = daysOfWeek;
                } else if (newAdjustment.value.condition_type === 'month') {
                    conditionValues.value = months;
                } else if (newAdjustment.value.condition_type === 'no_restriction') {
                    newAdjustment.value.condition_value = [];
                    conditionValues.value = [];
                } else {
                    conditionValues.value = [];
                }
            };
            const updateEditConditionValues = () => {
                if (editAdjustment.value.condition_type === 'day_of_week') {
                    conditionValues.value = daysOfWeek;
                } else if (editAdjustment.value.condition_type === 'month') {
                    conditionValues.value = months;
                } else if (editAdjustment.value.condition_type === 'no_restriction') {
                    editAdjustment.value.condition_value = [];
                    conditionValues.value = [];
                } else {
                    conditionValues.value = [];
                }
            };

            const saveAdjustment = async () => {
                // Validation
                    if (newAdjustment.value.date_end && new Date(newAdjustment.value.date_end) < new Date(newAdjustment.value.date_start)) {                    
                        toast.add({ 
                            severity: 'error', 
                            summary: 'Error', 
                            detail: 'End date must be equal to or greater than start date.', life: 3000 
                        });
                        return;
                    }
                    if (newAdjustment.value.adjustment_value === 0) {
                        toast.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Adjustment value must be different than 0.',
                            life: 3000
                        });
                        return;
                    }

                // Conversion from Datetime to Date
                    const formatDate = (date) => {
                        if (!date) return null;
                        const d = new Date(date);
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    };
                    const formattedAdjustment = {
                        ...newAdjustment.value,
                        date_start: formatDate(newAdjustment.value.date_start),
                        date_end: formatDate(newAdjustment.value.date_end),
                    };

                try {
                    const authToken = localStorage.getItem('authToken');
                    const response = await fetch(`/api/plans/${props.plan.id}/rates`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(formattedAdjustment),
                    });
                    if (!response.ok) {
                        throw new Error('Failed to save adjustment');
                    } 

                    fetchRates();
                    showAdjustmentDialog.value = false;
                    newAdjustment.value = {
                        hotel_id: null,
                        plans_global_id: null,
                        plans_hotel_id: null,
                        adjustment_type: 'base_rate',
                        adjustment_value: 0,
                        condition_type: 'no_restriction',
                        condition_value: [],
                        date_start: null,
                        date_end: null,
                    };

                    toast.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Rate created successfully',
                        life: 3000
                    });
                } catch (error) {
                    console.error('Error saving adjustment:', error);
                }
            };

            const updateAdjustment = async () => {
                // Validation
                if (editAdjustment.value.date_end && new Date(editAdjustment.value.date_end) < new Date(editAdjustment.value.date_start)) {
                    toast.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'End date must be equal to or greater than start date.',
                        life: 3000
                    });
                    return;
                }
                if (editAdjustment.value.adjustment_value === 0) {
                    toast.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Adjustment value must be different than 0.',
                        life: 3000
                    });
                    return;
                }

                // Conversion from Datetime to Date
                const formatDate = (date) => {
                    if (!date) return null;
                    const d = new Date(date);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                const formattedAdjustment = {
                    ...editAdjustment.value,
                    date_start: formatDate(editAdjustment.value.date_start),
                    date_end: formatDate(editAdjustment.value.date_end),
                };

                try {
                    const authToken = localStorage.getItem('authToken');
                    const response = await fetch(`/api/plans/rates/${editAdjustment.value.id}`, {  // Use adjustment ID for PUT request
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(formattedAdjustment),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update adjustment');
                    }

                    fetchRates(); // Refresh the rates
                    showEditAdjustmentDialog.value = false; // Close the dialog
                    editAdjustment.value = {
                        hotel_id: null,
                        plans_global_id: null,
                        plans_hotel_id: null,
                        adjustment_type: 'base_rate',
                        adjustment_value: 0,
                        condition_type: 'no_restriction',
                        condition_value: [],
                        date_start: null,
                        date_end: null,
                        id: null // Reset the ID after updating
                    };

                    toast.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Rate updated successfully',
                        life: 3000
                    });
                } catch (error) {
                    console.error('Error updating adjustment:', error);
                    toast.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'An error occurred while updating the rate.',
                        life: 3000
                    });
                }
            };


            // Computed             
            const filteredBaseRateSum = computed(() => {
                if (!filteredCurrentConditions.value || filteredCurrentConditions.value.length === 0) {
                    return null;
                }

                const selectedDateObj = new Date(selectedDate.value);
                const selectedDay = selectedDateObj.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
                const selectedMonth = selectedDateObj.toLocaleString('en-us', { month: 'long' }).toLowerCase();

                const filteredRates = filteredCurrentConditions.value.filter(rate => {
                    if (rate.condition_type === 'day_of_week' && rate.adjustment_type === 'base_rate') {
                        // Directly check if the day is included in condition_value string
                        const conditionDays = rate.condition_value;
                        if (conditionDays.includes(selectedDay)) {
                            return true;
                        }
                    }

                    if (rate.condition_type === 'month' && rate.adjustment_type === 'base_rate') {
                        // Directly check if the month is included in condition_value string
                        const conditionMonths = rate.condition_value;
                        if (conditionMonths.includes(selectedMonth.toString())) {
                            return true;
                        }
                    }

                    if (rate.condition_type === 'no_restriction' && rate.adjustment_type === 'base_rate') {                        
                        return true;
                        
                    }

                    return false;
                });

                const sum = filteredRates.reduce((total, rate) => {
                    const adjustmentValue = parseFloat(rate.adjustment_value) || 0;
                    return total + adjustmentValue;
                }, 0);

                return sum > 0 ? sum : null;
            });

            const filteredFlatFeeSum = computed(() => {
                if (!filteredCurrentConditions.value || filteredCurrentConditions.value.length === 0) { 
                    // console.log('No filtered current conditions found.');
                    return null; 
                }

                const selectedDateObj = new Date(selectedDate.value);
                const selectedDay = selectedDateObj.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();                
                const selectedMonth = selectedDateObj.toLocaleString('en-us', { month: 'long' }).toLowerCase();

                // console.log('Selected Date:', selectedDate.value);
                // console.log('Selected Day:', selectedDay);
                // console.log('Selected Month:', selectedMonth);

                // Filter for flat_fee adjustments
                const filteredRates = filteredCurrentConditions.value.filter(rate => {
                    // console.log('Checking rate:', rate);

                    // Handle day_of_week condition
                    if (rate.condition_type === 'day_of_week' && rate.adjustment_type === 'flat_fee') {
                        try {
                            // Directly check if the day is included in condition_value string
                            const conditionDays = rate.condition_value; // Condition is in string format now
                            // console.log('Condition Days (raw):', conditionDays);

                            if (conditionDays.includes(selectedDay)) {
                                // console.log('Selected day is in condition:', selectedDay);
                                return true;
                            }
                        } catch (e) {
                            console.log('Error checking day_of_week condition:', e);
                        }
                    }

                    // Handle month condition
                    if (rate.condition_type === 'month' && rate.adjustment_type === 'flat_fee') {
                        try {
                            // Directly check if the month is included in condition_value string
                            const conditionMonths = rate.condition_value; // Condition is in string format now
                            // console.log('Condition Months (raw):', conditionMonths);

                            if (conditionMonths.includes(selectedMonth.toString())) {
                                // console.log('Selected month is in condition:', selectedMonth);
                                return true;
                            }
                        } catch (e) {
                            console.log('Error checking month condition:', e);
                        }
                    }

                    if (rate.condition_type === 'no_restriction' && rate.adjustment_type === 'flat_fee') {                        
                        return true;
                        
                    }

                    return false;
                });

                // console.log('Filtered Flat Fee Rates:', filteredRates);

                // Sum the adjustment_value of all flat_fee rates                
                const sum = filteredRates.reduce((total, rate) => {
                    const adjustmentValue = parseFloat(rate.adjustment_value) || 0;
                    // console.log('Adding adjustment_value:', adjustmentValue);
                    return total + adjustmentValue;
                }, 0);

                // console.log('Final sum:', sum);

                return sum > 0 ? sum : null;
            });

            const filteredPercentageSum = computed(() => {
                if (!filteredCurrentConditions.value || filteredCurrentConditions.value.length === 0) {
                    return null;
                }

                const selectedDateObj = new Date(selectedDate.value);
                const selectedDay = selectedDateObj.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();                
                const selectedMonth = selectedDateObj.toLocaleString('en-us', { month: 'long' }).toLowerCase();

                const filteredRates = filteredCurrentConditions.value.filter(rate => {
                    if (rate.condition_type === 'day_of_week' && rate.adjustment_type === 'percentage') {
                        // Directly check if the day is included in condition_value string
                        const conditionDays = rate.condition_value;
                        if (conditionDays.includes(selectedDay)) {
                            return true;
                        }
                    }

                    if (rate.condition_type === 'month' && rate.adjustment_type === 'percentage') {
                        // Directly check if the month is included in condition_value string
                        const conditionMonths = rate.condition_value;
                        if (conditionMonths.includes(selectedMonth.toString())) {
                            return true;
                        }
                    }

                    if (rate.condition_type === 'no_restriction' && rate.adjustment_type === 'percentage') {                        
                        return true;
                        
                    }

                    return false;
                });

                const sum = filteredRates.reduce((total, rate) => {
                    const adjustmentValue = parseFloat(rate.adjustment_value) || 0;
                    return total + adjustmentValue;
                }, 0);

                return sum > 0 ? sum : null;                
            });

            const filteredCurrentConditions = computed(() => {
                if (!selectedDate.value) return null;

                // Normalized date
                const selectedDateObj = new Date(selectedDate.value);
                selectedDateObj.setHours(0, 0, 0, 0);

                return allRates.value
                    .filter(condition => {                    
                        const startDate = new Date(condition.date_start);
                        startDate.setHours(0, 0, 0, 0);                        
                        const endDate = condition.date_end ? new Date(condition.date_end) : null;
                        if (endDate) endDate.setHours(0, 0, 0, 0);                        
                        return selectedDateObj >= startDate && (endDate ? selectedDateObj <= endDate : true);
                    });
            });

            const filteredFutureConditions = computed(() => {
                if (!selectedDate.value) return null;
                
                // Normalized date
                const selectedDateObj = new Date(selectedDate.value);
                selectedDateObj.setHours(0, 0, 0, 0);

                return allRates.value
                    .filter(condition => {
                        const startDate = new Date(condition.date_start);
                        startDate.setHours(0, 0, 0, 0);                        
                        return startDate > selectedDateObj;
                });

                
            });

            const filteredPastConditions = computed(() => {
                if (!selectedDate.value) return null;

                // Normalized date
                const selectedDateObj = new Date(selectedDate.value);
                selectedDateObj.setHours(0, 0, 0, 0);

                return allRates.value
                    .filter(condition => {
                        const startDate = new Date(condition.date_start);
                        startDate.setHours(0, 0, 0, 0);
                        const endDate = condition.date_end ? new Date(condition.date_end) : null;
                        if (endDate) endDate.setHours(0, 0, 0, 0);
                        return startDate < selectedDateObj && endDate != null;
                    });
            });

            
/*
            const filteredAddonSum = computed(() => {
                if (filteredCurrentAddons.length === 0) return null;
                const filteredAddons = filteredCurrentAddons;
                const sum = filteredAddons.reduce((total, addon) => {                    
                    return total + (addon.price || 0); 
                }, 0);
                return sum > 0 ? sum : null;
            });
            const filteredAddonCount = computed(() => {
                const filteredAddons = filteredCurrentAddons;
                return filteredAddons.length;
            });
*/
            onMounted(fetchRates);

            // Watcher
            watch(() => editAdjustment.value.condition_value, (newValue) => {
                
                if (typeof newValue === 'string') {                    
                    try {                        
                        // Ensure the string is correctly formatted as a JSON array
                        // Fix the string format to make it valid JSON
                        let correctedValue = editAdjustment.value.condition_value
                            .replace(/{/g, '[')  // Replace '{' with '['
                            .replace(/}/g, ']')  // Replace '}' with ']'                            

                        // Now attempt to parse the corrected string into an array
                        const parsedValue = JSON.parse(correctedValue);                        

                        selectedEditConditions.value = Array.isArray(parsedValue) ? parsedValue : [];
                    } catch (error) {
                        console.error('Error parsing condition_value:', error);
                        selectedEditConditions.value = [];
                    }
                } else {
                    // If condition_value is already an array, assign it directly
                    selectedEditConditions.value = newValue || [];
                }
            }, { immediate: true });
/*
            watch(editAdjustment, (newVal, oldVal) => {                
                // console.log('editAdjustment changed:', newVal);                
            }, { deep: true });
            watch(newAdjustment, (newVal, oldVal) => {                
                // console.log('newAdjustment changed:', newVal);                
            }, { deep: true });
            watch(allRates, (newVal, oldVal) => {                
                // console.log('allRates changed:', newVal);                
            }, { deep: true });
*/
            
            return {
                planId,
                selectedDate,
                allRates,                
                showAdjustmentDialog,
                showEditAdjustmentDialog,
                selectedEditConditions,
                newAdjustment,
                editAdjustment,
                adjustmentTypes,
                conditionTypes,
                conditionValues, 
                daysOfWeek,
                months, 
                openAdjustmentDialog,    
                openEditAdjustmentDialog,      
                updateConditionValues,
                updateEditConditionValues,
                saveAdjustment, 
                updateAdjustment,               
                filteredBaseRateSum,
                filteredFlatFeeSum,
                filteredPercentageSum,
                filteredCurrentConditions,
                filteredFutureConditions,
                filteredPastConditions,  
                //filteredAddonSum,   
                //filteredAddonCount,                       
            };
        },
        methods: {
            formatNumber(value, style) {
                if(style === 'currency'){
                    return new Intl.NumberFormat('ja-JP', {
                        style: 'currency',
                        currency: 'JPY',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(value);
                }
                if(style === 'decimal'){
                    return new Intl.NumberFormat('ja-JP', {
                        style: 'decimal',
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2
                    }).format(value);
                }                
            },
            handleFilteredAddons(addons) {
                this.addons = addons;
                // console.log("Received filtered conditions in parent:", addons);
            }
        },
        computed: {
            filteredAddonCount() {
                // Count the number of addons
                return this.addons.length;
            },
            filteredAddonSum() {
                // Calculate the sum of the `price` field for all addons
                return this.addons.reduce((sum, addon) => sum + (addon.price || 0), 0);
            }
        },
    };
</script>
  
<style scoped>

</style>