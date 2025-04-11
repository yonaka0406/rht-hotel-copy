<template>
    
</template>
<script setup>
    // Vue
    import { ref, onMounted } from 'vue';

    const props = defineProps({        
        hotel_id: {
            type: [Number],
            required: true,
        },
    });

    // Stores
    import { useXMLStore } from '@/composables/useXMLStore';
    const { template, fetchServiceName, fetchFieldName, fetchXMLTemplate } = useXMLStore();

    // Primevue
    import { Panel, Accordion, AccordionPanel, AccordionHeader, AccordionContent, Card, FloatLabel, InputText, Select, Button, DataTable, Column, Badge, Dialog } from 'primevue';

    // Template    
    const templateName = 'NetRoomTypeMasterSearchService';
    const extractionProcedureCode = 0;
    const modifiedTemplate = ref(null);
    const fetchTemplate = async () => {
        await fetchXMLTemplate(props.hotel_id, templateName);
        modifiedTemplate.value = template.value.replace(
            `{{extractionProcedureCode}}`,
            extractionProcedureCode
        );
        console.log('replace modifiedTemplate', modifiedTemplate.value);
    };

    onMounted(async () => {
        await fetchTemplate();
    });

</script>