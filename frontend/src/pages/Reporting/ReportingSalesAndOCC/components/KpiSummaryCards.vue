<template>
    <!-- Grid Layout: 4 blocks (Used in Table views) -->
    <div v-if="variant === 'grid'" class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow">
            <h6 class="text-sm font-medium text-gray-500 dark:text-gray-400">ADR</h6>
            <p class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ formatCurrency(actualADR || 0) }}</p>
            <span v-if="ADRDifference !== null && ADRDifference !== undefined"
                :class="['text-xs font-bold', ADRDifference > 0 ? 'text-green-500 dark:text-green-400' : (ADRDifference < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')]">
                {{ ADRDifference > 0 ? '+' : '' }}{{ formatCurrency(ADRDifference) }}
            </span>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow">
            <h6 class="text-sm font-medium text-gray-500 dark:text-gray-400">計画 ADR</h6>
            <p class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ formatCurrency(forecastADR || 0) }}</p>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow">
            <h6 class="text-sm font-medium text-gray-500 dark:text-gray-400">RevPAR</h6>
            <p class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ formatCurrency(actualRevPAR || 0) }}</p>
            <span v-if="revPARDifference !== null && revPARDifference !== undefined"
                :class="['text-xs font-bold', revPARDifference > 0 ? 'text-green-500 dark:text-green-400' : (revPARDifference < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')]">
                {{ revPARDifference > 0 ? '+' : '' }}{{ formatCurrency(revPARDifference) }}
            </span>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow">
            <h6 class="text-sm font-medium text-gray-500 dark:text-gray-400">計画 RevPAR</h6>
            <p class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ formatCurrency(forecastRevPAR || 0) }}</p>
        </div>
    </div>

    <!-- Cards Layout: 2 cards with labels and values in parens (Used in Graph views) -->
    <div v-else-if="variant === 'cards'" class="grid grid-cols-2 gap-4 kpi-section">
        <Card class="shadow-sm bg-gray-50 dark:bg-gray-800">
            <template #content>
                <div class="flex flex-col items-center text-center">
                    <h6 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">ADR</h6>
                    <span class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ formatCurrency(actualADR || 0)
                        }}</span>
                    <span class="text-xs text-gray-400 dark:text-gray-500 mt-1">(計画: {{ formatCurrency(forecastADR || 0)
                        }})</span>
                    <span v-if="ADRDifference !== null && ADRDifference !== undefined"
                        :class="['text-xs font-bold mt-1', ADRDifference > 0 ? 'text-green-500 dark:text-green-400' : (ADRDifference < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')]">
                        {{ ADRDifference > 0 ? '+' : '' }}{{ formatCurrency(ADRDifference) }}
                    </span>
                </div>
            </template>
        </Card>
        <Card class="shadow-sm bg-gray-50 dark:bg-gray-800">
            <template #content>
                <div class="flex flex-col items-center text-center">
                    <h6 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">RevPAR</h6>
                    <span class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ formatCurrency(actualRevPAR ||
                        0)
                        }}</span>
                    <span class="text-xs text-gray-400 dark:text-gray-500 mt-1">(計画: {{ formatCurrency(forecastRevPAR ||
                        0)
                        }})</span>
                    <span v-if="revPARDifference !== null && revPARDifference !== undefined"
                        :class="['text-xs font-bold mt-1', revPARDifference > 0 ? 'text-green-500 dark:text-green-400' : (revPARDifference < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')]">
                        {{ revPARDifference > 0 ? '+' : '' }}{{ formatCurrency(revPARDifference) }}
                    </span>
                </div>
            </template>
        </Card>
    </div>
</template>

<script setup>
import { Card } from 'primevue';

defineProps({
    actualADR: {
        type: Number,
        default: 0
    },
    forecastADR: {
        type: Number,
        default: 0
    },
    ADRDifference: Number,
    actualRevPAR: {
        type: Number,
        default: 0
    },
    revPARDifference: Number,
    forecastRevPAR: {
        type: Number,
        default: 0
    },
    formatCurrency: {
        type: Function,
        required: true
    },
    variant: {
        type: String,
        default: 'grid' // 'grid' (4 blocks) or 'cards' (2 cards)
    }
});
</script>
