<template>
    <div>        
        <span>abc</span>
    </div>
</template>
<script setup>
    // Vue
    import { ref, computed } from 'vue';
    
    // Props
    const props = defineProps({
        revenueData: {
            type: Array,
            required: true
        },
        occupancyData: {
            type: Array,
            required: true
        },
        selectedDate: {
            type: Date,
            required: true
        },
        selectedHotels: {
            type: Array,
            required: true
        }
    });
</script>