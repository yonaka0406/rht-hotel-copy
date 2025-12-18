<template>
    <div v-if="plan">
        <!-- Panel -->        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
                <template #header>
                    <h3 class="text-xl font-semibold">日付を選択:</h3>
                </template>
                <template #content>
                    <DatePicker v-model="selectedDate" 
                        :showIcon="true" 
                        iconDisplay="input" 
                        :selectOtherMonths="true"                 
                        fluid
                        dateFormat="yy-mm-dd" 
                    />                        
                    <div class="mt-4 bg-green-100 p-2 rounded-lg">
                        <p v-if="totalPriceForSelectedDay !== null">
                            当日料金: {{ formatNumber(totalPriceForSelectedDay, 'currency') }}
                        </p>
                        <p v-else>選択した日付の料金が見つかりません。</p>
                    </div>                        
                </template>
            </Card>
            <Card>
                <template #header>
                    <h3 class="text-xl font-semibold">現在の基本料金:</h3>
                </template>
                <template #content>
                    <div>
                        <p v-if="filteredBaseRateSum !== null">
                            基本料金合計: {{ formatNumber(filteredBaseRateSum, 'currency') }}
                        </p>
                        <p v-else>選択した日付の基本料金が見つかりません。</p>
                    </div>
                </template>
            </Card>
            <Card>
                <template #header>
                    <h3 class="text-xl font-semibold">現在の定額料金調整:</h3>
                </template>
                <template #content>
                    <div>
                        <p v-if="filteredFlatFeeSum !== null">
                            定額料金合計: {{ formatNumber(filteredFlatFeeSum, 'currency') }}
                        </p>
                        <p v-else>選択した日付の定額料金調整が見つかりません。</p>
                    </div>
                </template>
            </Card>
            <Card>
                <template #header>
                    <h3 class="text-xl font-semibold">現在のパーセント調整:</h3>
                </template>
                <template #content>
                    <div>
                        <p v-if="filteredPercentageSum !== null">
                            合計パーセント: {{ formatNumber(filteredPercentageSum, 'decimal') }}%
                        </p>
                        <p v-else>選択した日付のパーセント調整が見つかりません。</p>
                    </div>
                </template>
            </Card>
            <Card>
                <template #header>
                    <h3 class="text-xl font-semibold">現在のアドオン:</h3>
                </template>
                <template #content>
                    <div>
                        <p>カウント: {{ filteredAddonCount }}</p>
                        <p>料金合計: {{ formatNumber(filteredAddonSum, 'currency') }}</p>
                    </div>
                </template>
            </Card>
            <Card>
                <template #header>
                    <h3 class="text-xl font-semibold">販売区分:</h3>
                </template>
                <template #content>
                    <div>
                        <Badge v-for="category in filteredSalesCategory" :key="category" :value="formatSalesCategory(category)" severity="secondary" class="mr-2"></Badge>
                    </div>
                </template>
            </Card>
            
        </div>

        <!-- Conditions -->
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
                            <Column field="date_start" header="開始" style="min-width: 150px;"></Column>
                            <Column field="date_end" header="終了" style="min-width: 150px;"></Column>    
                            <Column header="料金" style="min-width: 180px;">
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
                                    <Badge v-if="(slotProps.data.adjustment_type === 'flat_fee' || slotProps.data.adjustment_type === 'percentage') && slotProps.data.include_in_cancel_fee"
                                        value="キャンセル料対象"
                                        severity="danger"
                                        class="ml-1">
                                    </Badge>
                                    <Badge :value="formatSalesCategory(slotProps.data.sales_category)" 
                                           :severity="slotProps.data.sales_category === 'other' ? 'warn' : 'success'" 
                                           class="ml-1">
                                    </Badge>
                                    
                                </template>
                            </Column>
                            <Column header="条件" style="min-width: 200px;">
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
                            <Column field="date_start" header="開始" style="min-width: 150px;"></Column>
                            <Column field="date_end" header="終了" style="min-width: 150px;"></Column>    
                            <Column header="料金" style="min-width: 180px;">
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
                                    <Badge v-if="(slotProps.data.adjustment_type === 'flat_fee' || slotProps.data.adjustment_type === 'percentage') && slotProps.data.include_in_cancel_fee"
                                        value="キャンセル料対象"
                                        severity="danger"
                                        class="ml-1">
                                    </Badge>
                                    <Badge :value="formatSalesCategory(slotProps.data.sales_category)" 
                                           :severity="slotProps.data.sales_category === 'other' ? 'warn' : 'success'" 
                                           class="ml-1">
                                    </Badge>
                                    
                                </template>
                            </Column>
                            <Column header="条件" style="min-width: 200px;">
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
                            <Column field="date_start" header="開始" style="min-width: 150px;"></Column>
                            <Column field="date_end" header="終了" style="min-width: 150px;"></Column>    
                            <Column header="料金" style="min-width: 180px;">
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
                                    <Badge v-if="(slotProps.data.adjustment_type === 'flat_fee' || slotProps.data.adjustment_type === 'percentage') && slotProps.data.include_in_cancel_fee"
                                        value="キャンセル料対象"
                                        severity="danger"
                                        class="ml-1">
                                    </Badge>
                                    <Badge :value="formatSalesCategory(slotProps.data.sales_category)" 
                                           :severity="slotProps.data.sales_category === 'other' ? 'warn' : 'success'" 
                                           class="ml-1">
                                    </Badge>
                                </template>
                            </Column>
                            <Column header="条件" style="min-width: 200px;">
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
        
        <Dialog header="新規調整" v-model:visible="showAdjustmentDialog" :modal="true" :style="{ width: '60vw' }" class="p-fluid" :closable="true">
            <div class="grid grid-cols-2 gap-2 gap-y-6 pt-6">
                <div class="col-span-2">
                    <FloatLabel>
                        <Select v-model="newAdjustment.adjustment_type"
                        :options="adjustmentTypes"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                        required />
                    </FloatLabel>
                </div>
                <div class="col-span-2">
                    <FloatLabel>
                        <Select
                            v-model="newAdjustment.sales_category"
                            :options="sales_category_options"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                        <label>販売区分</label>
                    </FloatLabel>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <label for="adjustmentValue">調整値 *</label>
                    <div v-if="newAdjustment.adjustment_type !== 'percentage'">
                    <InputNumber v-model="newAdjustment.adjustment_value"
                        mode="currency"
                        currency="JPY"
                        locale="ja-JP"
                        class="w-full"
                        required
                        fluid
                    />
                    </div>
                    <div v-else>
                    <InputNumber v-model="newAdjustment.adjustment_value"
                        :minFractionDigits="2"
                        :maxFractionDigits="2"
                        suffix="%"
                        class="w-full"
                        required
                        fluid
                    />
                    </div>
                </FloatLabel>
                <small class="text-gray-500" v-if="newAdjustment && newAdjustment.adjustment_type !== 'percentage'">
                    税抜価格: {{ formatNumber(adjustmentNetPrice, 'currency') }}
                </small>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <Select
                        v-model="newAdjustment.tax_type_id"
                        :options="taxTypes"
                        optionLabel="name"
                        optionValue="id"
                        @change="updateTaxRate"
                        fluid
                    />
                    <label>税区分</label>
                </FloatLabel>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <label for="conditionType">条件区分 *</label>
                    <Select v-model="newAdjustment.condition_type"
                        :options="conditionTypes"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full"
                        @change="updateConditionValues"
                        required
                        fluid
                    />
                </FloatLabel>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <label for="conditionValue">条件</label>
                    <MultiSelect v-model="newAdjustment.condition_value"
                        placeholder="条件"
                        :options="conditionValues"
                        optionLabel="label"
                        optionValue="value"
                        :maxSelectedLabels="3"
                        fluid
                    />
                </FloatLabel>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <label for="dateStart">開始日</label>
                    <DatePicker v-model="newAdjustment.date_start"
                        :showIcon="true"
                        iconDisplay="input"
                        dateFormat="yy-mm-dd"
                        :selectOtherMonths="true"
                        placeholder="開始日"
                        fluid
                        required
                    />
                </FloatLabel>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <label for="dateEnd">終了日</label>
                    <DatePicker v-model="newAdjustment.date_end"
                        :showIcon="true"
                        iconDisplay="input"
                        dateFormat="yy-mm-dd"
                        :selectOtherMonths="true"
                        placeholder="終了日"
                        fluid
                    />
                </FloatLabel>
                </div>
                <div class="col-span-2">
                    <FloatLabel>
                        <label for="comment">コメント</label>
                        <Textarea v-model="newAdjustment.comment" rows="3" class="w-full" />
                    </FloatLabel>
                </div>
                <div class="col-span-2" v-if="newAdjustment.adjustment_type === 'flat_fee' || newAdjustment.adjustment_type === 'percentage'">
                    <div class="flex items-center">
                        <Checkbox v-model="newAdjustment.include_in_cancel_fee" inputId="includeInCancelFee" :binary="true" />
                        <label for="includeInCancelFee" class="ml-2">キャンセル料に含める</label>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="保存" icon="pi pi-check" @click="saveAdjustment" class="p-button-success p-button-text p-button-sm" />
                <Button label="キャンセル" icon="pi pi-times" @click="showAdjustmentDialog = false" class="p-button-danger p-button-text p-button-sm" text />
            </template>
            </Dialog>

        <Dialog header="調整編集" v-model:visible="showEditAdjustmentDialog" :modal="true" :style="{ width: '60vw' }" class="p-fluid" :closable="true">
            <div class="grid grid-cols-2 gap-2 gap-y-6 pt-6">
                <div class="col-span-2">
                    <FloatLabel>
                        <Select v-model="editAdjustment.adjustment_type"
                            :options="adjustmentTypes"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                            required 
                        />
                    </FloatLabel>
                </div>
                <div class="col-span-2">
                    <FloatLabel>
                        <Select
                            v-model="editAdjustment.sales_category"
                            :options="sales_category_options"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                        <label>販売区分</label>
                    </FloatLabel>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <label for="adjustmentValue">調整値 *</label>
                    <div v-if="editAdjustment.adjustment_type !== 'percentage'">
                    <InputNumber v-model="editAdjustment.adjustment_value"
                        mode="currency"
                        currency="JPY"
                        locale="ja-JP"
                        class="w-full"
                        required
                        fluid
                    />
                    </div>
                    <div v-else>
                    <InputNumber v-model="editAdjustment.adjustment_value"
                        :minFractionDigits="2"
                        :maxFractionDigits="2"
                        suffix="%"
                        class="w-full"
                        required
                        fluid
                    />
                    </div>
                </FloatLabel>
                <small class="text-gray-500" v-if="editAdjustment && editAdjustment.adjustment_type !== 'percentage'">
                    税抜価格: {{ formatNumber(adjustmentNetPrice, 'currency') }}
                </small>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <Select
                        v-model="editAdjustment.tax_type_id"
                        :options="taxTypes"
                        optionLabel="name"
                        optionValue="id"
                        @change="updateTaxRate"
                        fluid
                    />
                    <label>税区分</label>
                </FloatLabel>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <label for="conditionType">条件区分 *</label>
                    <Select v-model="editAdjustment.condition_type"
                        :options="conditionTypes"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full"
                        @change="updateEditConditionValues"
                        required
                        fluid
                    />
                </FloatLabel>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <label for="conditionValue">条件</label>
                    <MultiSelect
                        v-model="selectedEditConditions"
                        :options="conditionValues"
                        optionLabel="label"
                        optionValue="value"
                        :maxSelectedLabels="3"
                        placeholder="条件"
                        fluid
                    />
                </FloatLabel>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <label for="dateStart">開始日</label>
                    <DatePicker v-model="editAdjustment.date_start"
                        :showIcon="true"
                        iconDisplay="input"
                        dateFormat="yy-mm-dd"
                        :selectOtherMonths="true"
                        placeholder="開始日"
                        fluid
                        required
                    />
                </FloatLabel>
                </div>
                <div class="col-span-1">
                <FloatLabel>
                    <label for="dateEnd">終了日</label>
                    <DatePicker v-model="editAdjustment.date_end"
                        :showIcon="true"
                        iconDisplay="input"
                        dateFormat="yy-mm-dd"
                        :selectOtherMonths="true"
                        placeholder="終了日"
                        fluid
                    />
                </FloatLabel>
                </div>
                <div class="col-span-2">
                    <FloatLabel>
                        <label for="editComment">コメント</label>
                        <Textarea v-model="editAdjustment.comment" rows="3" class="w-full" />
                    </FloatLabel>
                </div>
                <div class="col-span-2" v-if="editAdjustment.adjustment_type === 'flat_fee' || editAdjustment.adjustment_type === 'percentage'">
                    <div class="flex items-center">
                        <Checkbox v-model="editAdjustment.include_in_cancel_fee" inputId="editIncludeInCancelFee" :binary="true" />
                        <label for="editIncludeInCancelFee" class="ml-2">キャンセル料に含める</label>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="更新" icon="pi pi-check" @click="updateAdjustment" class="p-button-success p-button-text p-button-sm" />
                <Button label="キャンセル" icon="pi pi-times" @click="showEditAdjustmentDialog = false" class="p-button-danger p-button-text p-button-sm" text />
            </template>
            </Dialog>

    </div>
</template>
  
<script setup>
    // Vue
    import { ref, watch, computed, onMounted } from 'vue';
    const props = defineProps({
        plan: {
            type: Object,
            required: true,
        }
    });
    import ManagePlansAddons from './ManagePlansAddons.vue';

    // Primevue
    import { useToast } from 'primevue/usetoast';    
    const toast = useToast();
    import { Card, Dialog, FloatLabel, DatePicker, InputNumber, MultiSelect, Select, Button,
        Accordion, AccordionPanel, AccordionHeader, AccordionContent, DataTable, Column, Badge, Checkbox, Textarea
     } from 'primevue';

    // Stores
    import { useSettingsStore } from '@/composables/useSettingsStore';
    const { taxTypes, fetchTaxTypes } = useSettingsStore();

     // Helper
    const formatNumber = (value, style) => {
        let thisValue = value;
        if(!thisValue){
            thisValue = 0;
        } 
        if(style === 'currency'){
            return new Intl.NumberFormat('ja-JP', {
                style: 'currency',
                currency: 'JPY',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(thisValue);
        }
        if(style === 'decimal'){
            return new Intl.NumberFormat('ja-JP', {
                style: 'decimal',
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2
            }).format(thisValue);
        }                
    };

    // Options
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
    const adjustmentTypes = [
        { label: '基本料金', value: 'base_rate' },
        { label: 'パーセント', value: 'percentage' },
        { label: '定額料金', value: 'flat_fee' },
    ];
    const conditionTypes = [
        { label: '条件なし', value: 'no_restriction' },
        { label: '曜日毎', value: 'day_of_week' },
        { label: '月毎', value: 'month' },
    ];

    const sales_category_options = ref([
        { label: '宿泊', value: 'accommodation' },
        { label: 'その他', value: 'other' },
    ]);

    // Panel    
    const selectedDate = ref(new Date().toISOString().split('T')[0]);
    const planId = ref({                
        plans_global_id: props.plan.context === 'global' ? props.plan.id : (props.plan.plans_global_id || 0),
        plans_hotel_id: props.plan.context === 'hotel' ? props.plan.plans_hotel_id : 0,
        hotel_id: props.plan.context === 'hotel' ? props.plan.hotel_id : 0, 
        date: selectedDate,
    });
    const addons = ref([]);
    const filteredAddonCount = computed(() => {
        return addons.value.length;
    });
    const filteredAddonSum = computed(() => {
        return addons.value.reduce((sum, addon) => sum + (addon.price || 0), 0);
    });
    const handleFilteredAddons = (addons) => {
        addons.value = addons;
    };
    const allRates = ref([]);

    // Adjustments
    const newAdjustment = ref(null);
    const editAdjustment = ref(null);
    const selectedEditConditions = ref([]); 
    const conditionValues = ref([]);    
    const showAdjustmentDialog = ref(false);
    const showEditAdjustmentDialog = ref(false);
    const newAdjustmentReset = () => {
        newAdjustment.value = {
            hotel_id: null,
            plans_global_id: null,
            plans_hotel_id: null,
            adjustment_type: 'base_rate',
            adjustment_value: 0,
            tax_type_id: 3,
            tax_rate: 0.1,
            condition_type: 'no_restriction',
            condition_value: [],
            date_start: new Date().toISOString().split('T')[0],
            date_end: null,
            include_in_cancel_fee: false,
            comment: null,
            sales_category: 'accommodation'
        };
    };
    const editAdjustmentReset = () => {
        editAdjustment.value = {
            hotel_id: null,
            plans_global_id: null,
            plans_hotel_id: null,
            adjustment_type: 'base_rate',
            adjustment_value: 0,
            tax_type_id: 3,
            tax_rate: 0.1,
            condition_type: 'no_restriction',
            condition_value: [],
            date_start: new Date().toISOString().split('T')[0],
            date_end: null,
            include_in_cancel_fee: false,
            comment: null,
            sales_category: 'accommodation'
        };
    };
    const adjustmentNetPrice = computed(() => {
        const targetAdjustment = showEditAdjustmentDialog.value ? editAdjustment.value : newAdjustment.value;        

        if (!targetAdjustment.adjustment_value || !targetAdjustment.tax_rate) return 0;   
        const price = Number(targetAdjustment.adjustment_value);
        const taxRate = Number(targetAdjustment.tax_rate);
        return Math.floor(price / (1 + taxRate));
    });
    const updateTaxRate = () => {
        const targetAdjustment = showEditAdjustmentDialog.value ? editAdjustment.value : newAdjustment.value;       
        const selectedTax = taxTypes.value.find(tax => tax.id === targetAdjustment.tax_type_id);        
        if(showAdjustmentDialog.value){
            newAdjustment.value.tax_rate = selectedTax ? selectedTax.percentage : 0;            
            // console.log('updateTaxRate newAdjustment:', newAdjustment.value)
        }
        if(showEditAdjustmentDialog.value){
            editAdjustment.value.tax_rate = selectedTax ? selectedTax.percentage : 0;            
            // console.log('updateTaxRate editAdjustment:', editAdjustment.value)
        }
    };
    const openAdjustmentDialog = () => {
        if (props.plan.context === 'global') {
            newAdjustment.value.plans_global_id = props.plan.id;
            newAdjustment.value.plans_hotel_id = null;
        } else if (props.plan.context === 'hotel') {
            newAdjustment.value.plans_global_id = props.plan.plans_global_id || 0;
            newAdjustment.value.plans_hotel_id = props.plan.plans_hotel_id;
            newAdjustment.value.hotel_id = props.plan.hotel_id;
        }
        showAdjustmentDialog.value = true;
    };
    const openEditAdjustmentDialog = (adjustmentData) => {
        // console.log('[openEditAdjustmentDialog] adjustmentData:', adjustmentData);
        editAdjustment.value = { 
            ...adjustmentData, 
            sales_category: adjustmentData.sales_category || 'accommodation' 
        };
        // Ensure condition_type is set before updating options
        updateEditConditionValues();
        // Log condition_type and conditionValues
        // console.log('[openEditAdjustmentDialog] condition_type:', editAdjustment.value.condition_type);
        // console.log('[openEditAdjustmentDialog] conditionValues:', conditionValues.value);
        // Normalize condition_value to match option values (lowercase)
        let normalized = toArray(editAdjustment.value.condition_value).map(v => typeof v === 'string' ? v.toLowerCase() : v);
        selectedEditConditions.value = normalized;
        // console.log('[openEditAdjustmentDialog] selectedEditConditions:', selectedEditConditions.value);
        showEditAdjustmentDialog.value = true;
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
        // console.log('[updateEditConditionValues] condition_type:', editAdjustment.value.condition_type);
        // console.log('[updateEditConditionValues] conditionValues:', conditionValues.value);
    };
    const saveAdjustment = async () => {
        // Validation
        if (!newAdjustment.value.date_start) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '開始日を入力してください。',
                life: 3000
            });
            return;
        }
        if (!newAdjustment.value.tax_type_id) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '税区分を選択してください。',
                life: 3000
            });
            return;
        }
        if (newAdjustment.value.date_end && new Date(newAdjustment.value.date_end) < new Date(newAdjustment.value.date_start)) {                    
            toast.add({ 
                severity: 'error', 
                summary: 'エラー',
                detail: '終了日と開始日の順番を確認してください。', life: 3000 
            });
            return;
        }
        if (newAdjustment.value.adjustment_value === 0) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '「0」ではない数値に設定してください。',
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
            condition_value: JSON.stringify(newAdjustment.value.condition_value),
        };

        // console.log('[saveAdjustment] Sending:', formattedAdjustment);
        try {
            const authToken = localStorage.getItem('authToken');
            // Use the correct numeric IDs for the API call
            const globalId = props.plan.context === 'global' ? props.plan.id : (props.plan.plans_global_id || 0);
            const hotelId = props.plan.context === 'hotel' ? props.plan.plans_hotel_id : 0;
            const hotelIdParam = props.plan.context === 'hotel' ? props.plan.hotel_id : 0;
            
            const response = await fetch(`/api/plans/${globalId}/${hotelId}/${hotelIdParam}/rates`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formattedAdjustment),
            });
            if (!response.ok) {
                throw new Error('調整の保存に失敗しました');
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
                summary: '成功',
                detail: '料金作成成功',
                life: 3000
            });
        } catch (error) {
            console.error('調整保存エラー:', error);
        }
    };
    const updateAdjustment = async () => {
        // Validation
        if (!editAdjustment.value.date_start) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '開始日を入力してください。',
                life: 3000
            });
            return;
        }
        if (!editAdjustment.value.tax_type_id) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '税区分を選択してください。',
                life: 3000
            });
            return;
        }
        if (editAdjustment.value.date_end && new Date(editAdjustment.value.date_end) < new Date(editAdjustment.value.date_start)) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '終了日と開始日の順番を確認してください。',
                life: 3000
            });
            return;
        }
        if (editAdjustment.value.adjustment_value === 0) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '「0」ではない数値に設定してください。',
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
            condition_value: JSON.stringify(editAdjustment.value.condition_value),
        };

        // console.log('[updateAdjustment] Sending:', formattedAdjustment);
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
                throw new Error('調整の更新に失敗しました');
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
                summary: '成功',
                detail: '料金更新成功',
                life: 3000
            });
        } catch (error) {
            console.error('調整更新エラー:', error);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '料金の更新中にエラーが発生しました。',
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
                if (toArray(rate.condition_value).includes(selectedDay)) {
                    return true;
                }
            }

            if (rate.condition_type === 'month' && rate.adjustment_type === 'base_rate') {
                if (toArray(rate.condition_value).includes(selectedMonth)) {
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
            return null; 
        }

        const selectedDateObj = new Date(selectedDate.value);
        const selectedDay = selectedDateObj.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();                
        const selectedMonth = selectedDateObj.toLocaleString('en-us', { month: 'long' }).toLowerCase();

        // Filter for flat_fee adjustments
        const filteredRates = filteredCurrentConditions.value.filter(rate => {
            // Handle day_of_week condition
            if (rate.condition_type === 'day_of_week' && rate.adjustment_type === 'flat_fee') {
                if (toArray(rate.condition_value).includes(selectedDay)) {
                    return true;
                }
            }

            // Handle month condition
            if (rate.condition_type === 'month' && rate.adjustment_type === 'flat_fee') {
                if (toArray(rate.condition_value).includes(selectedMonth)) {
                    return true;
                }
            }

            if (rate.condition_type === 'no_restriction' && rate.adjustment_type === 'flat_fee') {                        
                return true;
            }

            return false;
        });

        // Sum the adjustment_value of all flat_fee rates                
        const sum = filteredRates.reduce((total, rate) => {
            const adjustmentValue = parseFloat(rate.adjustment_value) || 0;
            return total + adjustmentValue;
        }, 0);

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
                return toArray(rate.condition_value).includes(selectedDay);
            }
            if (rate.condition_type === 'month' && rate.adjustment_type === 'percentage') {
                return toArray(rate.condition_value).includes(selectedMonth);
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
        return sum !== 0 ? sum : null;
    });
    const filteredSalesCategory = computed(() => {
        if (!filteredCurrentConditions.value || filteredCurrentConditions.value.length === 0) {
            return [props.plan.sales_category];
        }
        const selectedDateObj = new Date(selectedDate.value);
        const selectedDay = selectedDateObj.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
        const selectedMonth = selectedDateObj.toLocaleString('en-us', { month: 'long' }).toLowerCase();
        const categories = new Set();
        filteredCurrentConditions.value.forEach(rate => {
            let match = false;
            if (rate.condition_type === 'day_of_week') {
                match = toArray(rate.condition_value).includes(selectedDay);
            } else if (rate.condition_type === 'month') {
                match = toArray(rate.condition_value).includes(selectedMonth);
            } else if (rate.condition_type === 'no_restriction') {
                match = true;
            }
            if (match) {
                categories.add(rate.sales_category);
            }
        });
        const result = Array.from(categories);
        return result.length > 0 ? result : [props.plan.sales_category];
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
                // A condition is "past" only if it has an end date AND the end date is before the selected date
                return endDate && endDate < selectedDateObj;
            });
    });    
            
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
                throw new Error('料金の取得に失敗しました');
            }

            const data = await response.json();
            allRates.value = data.map(rate => ({
                ...rate,
                date_start: formatDate(rate.date_start),
                date_end: formatDate(rate.date_end),
                condition_value: (() => {
                    if (!rate.condition_value) return [];
                    if (Array.isArray(rate.condition_value)) return rate.condition_value;
                    if (typeof rate.condition_value === 'string') {
                        try {
                            return JSON.parse(rate.condition_value);
                        } catch {
                            return [];
                        }
                    }
                    return [];
                })()
            }));
        } catch (error) {
            console.error('料金取得エラー:', error);
        }
    };

    onMounted( async () => {
        await fetchRates();
        await fetchTaxTypes();
        newAdjustmentReset();
        editAdjustmentReset();
    });

    // Watcher
    watch(() => editAdjustment.value?.condition_value, (newValue) => {        
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
                console.error('condition_value の解析エラー:', error);
                selectedEditConditions.value = [];
            }
        } else {
            // If condition_value is already an array, assign it directly
            selectedEditConditions.value = newValue || [];
        }
    }, { immediate: true });

    watch(selectedEditConditions, (newVal) => {
        // console.log('[watch selectedEditConditions] newVal:', newVal);
        editAdjustment.value.condition_value = newVal;
    });

    const totalPriceForSelectedDay = computed(() => {
        // console.group('Calculating totalPriceForSelectedDay');
        // console.log('Selected Date:', selectedDate.value);
        
        if (!filteredCurrentConditions.value || filteredCurrentConditions.value.length === 0) {
            // console.log('No filtered conditions found');
            // console.groupEnd();
            return null;
        }
        
        // console.log('Filtered Conditions:', filteredCurrentConditions.value);
        
        let baseRate = 0, percentage = 0, flatFee = 0;
        const selectedDateObj = new Date(selectedDate.value);
        const selectedDay = selectedDateObj.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
        const selectedMonth = selectedDateObj.toLocaleString('en-us', { month: 'long' }).toLowerCase();
        
        // console.log('Selected Day:', selectedDay);
        // console.log('Selected Month:', selectedMonth);
        
        filteredCurrentConditions.value.forEach((rate) => {
            // console.log('Rate:', rate);
            
            let match = false;
            if (rate.condition_type === 'day_of_week') {
                const conditionValues = toArray(rate.condition_value);
                // console.log('Day of week check - Condition values:', conditionValues, 'Selected day:', selectedDay);
                match = conditionValues.includes(selectedDay);
            } else if (rate.condition_type === 'month') {
                const conditionValues = toArray(rate.condition_value);
                // console.log('Month check - Condition values:', conditionValues, 'Selected month:', selectedMonth);
                match = conditionValues.includes(selectedMonth);
            } else if (rate.condition_type === 'no_restriction') {
                // console.log('No restriction - match is true');
                match = true;
            }
            
            // console.log('Does this rate match?', match);
            
            if (match) {
                const value = parseFloat(rate.adjustment_value) || 0;
                // console.log(`Matched rate - Type: ${rate.adjustment_type}, Value: ${value}`);
                
                if (rate.adjustment_type === 'base_rate') {
                    // console.log(`Adding to baseRate: ${value} (was ${baseRate})`);
                    baseRate += value;
                } else if (rate.adjustment_type === 'percentage') {
                    // console.log(`Adding to percentage: ${value} (was ${percentage})`);
                    percentage += value;
                } else if (rate.adjustment_type === 'flat_fee') {
                    // console.log(`Adding to flatFee: ${value} (was ${flatFee})`);
                    flatFee += value;
                }
            } else {
                // console.log('Rate did not match conditions');
            }
            
            // console.groupEnd();
        });
        
        // console.log('After processing all rates:');
        // console.log('Base Rate:', baseRate);
        // console.log('Percentage:', percentage);
        // console.log('Flat Fee:', flatFee);
        
        // Apply percentage adjustment and round down to nearest 100, matching backend logic
        const priceAfterPercentage = baseRate * (1 + percentage / 100);
        const roundedPrice = Math.floor(priceAfterPercentage / 100) * 100;
        // console.log('Price after percentage calculation:', priceAfterPercentage);
        // console.log('Price after rounding down to nearest 100:', roundedPrice);
        
        // Add flat fee after rounding
        const finalPrice = roundedPrice + flatFee;
        // console.log('Final price after adding flat fee:', finalPrice);
        
        // console.groupEnd();
        
        return finalPrice > 0 ? finalPrice : null;
    });

    // Utility function to ensure value is always an array
    const toArray = (val) => {
        if (Array.isArray(val)) return val;
        if (val == null) return [];
        if (typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                return [val];
            }
        }
        return [val];
    };

    const formatSalesCategory = (categories) => {
        if (!Array.isArray(categories)) {
            categories = [categories];
        }
        return categories.map(category => {
            switch (category) {
                case 'accommodation':
                    return '宿泊';
                case 'other':
                    return 'その他';
                default:
                    return category;
            }
        }).join(', ');
    };
 
</script>
  
<style scoped>

</style>
