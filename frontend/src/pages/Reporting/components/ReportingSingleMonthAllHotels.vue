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
    });
</script>