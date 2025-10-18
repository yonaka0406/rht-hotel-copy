<template>
    <div class="p-4">
        <Panel header="その他の設定">
            <PaymentSettings />
            <TaxSettings />
            <StampSettings />
        </Panel> 
    </div>
</template>

<script setup>
import { Panel } from "primevue";
import PaymentSettings from './components/PaymentSettings.vue';
import TaxSettings from './components/TaxSettings.vue';
import StampSettings from './components/StampSettings.vue';
</script>