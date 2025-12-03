<template>
    <Panel toggleable :collapsed="false" class="col-span-12">
        <template #header>
            <div class="flex items-center gap-2">                        
                <span class="font-bold ml-2 mt-2">
                    <div v-if="viewMode==='month'">
                        <span>当月KPI<small> PMSx計画</small></span><br/>
                        <small>（税抜き）</small>
                    </div>
                    <div v-else>
                        <span>当年度累計KPI<small> PMSx計画</small></span><br/>
                        <small>（税抜き）</small>
                    </div>
                </span>
            </div>
        </template>
        <div class="grid grid-cols-12 gap-4">
            <Card class="col-span-12 md:col-span-6 lg:col-span-3">
                <template #title>総売上</template>
                <template #content>
                    <div class="flex justify-center items-center p-2">
                        <div class="grid">
                            <span class="text-3xl lg:text-4xl font-bold text-blue-600">
                                {{ displayedCumulativeSales.toLocaleString('ja-JP') }} 円
                            </span>
                            <span v-if="forecastSales" class="text-sm text-blue-400">
                                (計画: {{ forecastSales.toLocaleString('ja-JP') }} 円)
                            </span>
                            <span v-if="salesDifference" :class="['text-sm', salesDifference > 0 ? 'text-green-500' : 'text-red-500']">
                                ({{ salesDifference > 0 ? '+' : '' }}{{ salesDifference.toLocaleString('ja-JP') }} 円)
                            </span>
                        </div>
                    </div>
                </template>
            </Card>
            <Card class="col-span-12 md:col-span-6 lg:col-span-3">
                <template #title>ADR</template>
                <template #content>
                    <div class="flex justify-center items-center p-2">
                        <div class="grid">
                            <span class="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 leading-snug">
                                {{ ADR.toLocaleString('ja-JP') }} 円
                            </span>
                            <span v-if="forecastADR" class="text-sm text-green-400 mt-1">
                                (計画: {{ forecastADR.toLocaleString('ja-JP') }} 円)
                            </span>
                            <span v-if="ADRDifference" :class="['text-sm mt-1', ADRDifference > 0 ? 'text-green-500' : 'text-red-500']">
                                ({{ ADRDifference > 0 ? '+' : '' }}{{ ADRDifference.toLocaleString('ja-JP') }} 円)
                            </span>
                        </div>
                    </div>
                </template>
            </Card>
            <Card class="col-span-12 md:col-span-6 lg:col-span-3">
                <template #title>RevPAR</template>
                <template #content>
                    <div class="flex justify-center items-center p-2">
                        <div class="grid">
                            <span class="text-3xl lg:text-4xl font-bold text-purple-600">{{ revPAR.toLocaleString('ja-JP') }} 円</span>
                            <span v-if="forecastRevPAR" class="text-sm text-purple-400">
                                (計画: {{ forecastRevPAR.toLocaleString('ja-JP') }} 円)
                            </span>
                            <span v-if="revPARDifference" :class="['text-sm', revPARDifference > 0 ? 'text-green-500' : 'text-red-500']">
                                ({{ revPARDifference > 0 ? '+' : '' }}{{ revPARDifference.toLocaleString('ja-JP') }} 円)
                            </span>
                        </div>
                    </div>
                </template>
            </Card>
            <Card class="col-span-12 md:col-span-6 lg:col-span-3">
                <template #title>OCC</template>
                <template #content>
                    <div class="flex justify-center items-center p-2">
                        <div class="grid">
                            <span class="text-3xl lg:text-4xl font-bold">{{ OCC }} %</span>
                            <span v-if="forecastOCC" class="text-sm text-orange-400">
                                (計画: {{ forecastOCC }} %)
                            </span>
                            <span v-if="OCCDifference" :class="['text-sm', OCCDifference > 0 ? 'text-green-500' : 'text-red-500']">
                                ({{ OCCDifference > 0 ? '+' : '' }}{{ parseFloat(OCCDifference).toFixed(2) }} %)
                            </span>
                        </div>
                    </div>
                </template>
            </Card>
        </div>
        <Fieldset legend="KPI 説明" :toggleable="true" :collapsed="true" class="mt-4">
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 md:col-span-3">
                    <strong>総売上:</strong>
                    <p class="m-0 text-sm">仮予約、確定予約のプランとアドオンの合計。保留予約と社員を含まない金額。</p>
                </div>
                <div class="col-span-12 md:col-span-3">
                    <strong>ADR (客室平均単価):</strong>
                    <p class="m-0 text-center text-sm">
                        <span class="inline-block">
                            <span class="">売上の合計</span><br>
                            <span class="inline-block border-t border-black px-2">販売部屋数の合計</span>
                        </span>
                    </p>
                </div>
                <div class="col-span-12 md:col-span-3">
                    <strong>RevPAR (1室あたりの収益額):</strong>
                    <p class="m-0 text-center text-sm">
                        <span class="inline-block">
                            <span class="">売上の合計</span><br>
                            <span class="inline-block border-t border-black px-2">販売可能総部屋数 × 期間日数</span>
                        </span>
                    </p>
                </div>
                <div class="col-span-12 md:col-span-3">
                    <strong>OCC (稼働率):</strong>
                    <p class="m-0 text-center text-sm">
                        <span class="inline-block">
                            <span class="">販売部屋数の合計</span><br>
                            <span class="inline-block border-t border-black px-2">販売可能総部屋数</span>
                        </span>
                    </p>
                </div>
            </div>
        </Fieldset>
    </Panel>
</template>

<script setup>
import { defineProps } from 'vue';
import { Card, Fieldset, Panel } from 'primevue';

const props = defineProps({
    viewMode: {
        type: String,
        required: true
    },
    displayedCumulativeSales: {
        type: Number,
        required: true
    },
    forecastSales: {
        type: Number,
        default: 0
    },
    salesDifference: {
        type: Number,
        default: 0
    },
    ADR: {
        type: Number,
        required: true
    },
    forecastADR: {
        type: Number,
        default: 0
    },
    ADRDifference: {
        type: Number,
        default: 0
    },
    revPAR: {
        type: Number,
        required: true
    },
    forecastRevPAR: {
        type: Number,
        default: 0
    },
    revPARDifference: {
        type: Number,
        default: 0
    },
    OCC: {
        type: Number,
        required: true
    },
    forecastOCC: {
        type: Number,
        default: 0
    },
    OCCDifference: {
        type: Number,
        default: 0
    }
});
</script>