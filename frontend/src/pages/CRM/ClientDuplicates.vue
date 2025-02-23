<template>
    <div class="min-h-screen">
        <div class="grid grid-cols-12 gap-4">            
            <Card class="flex col-span-12">
                <template #title>
                    <p>最近登録された顧客：テーブル</p>
                </template>
                <template #subtitle>
                    <p>Clients with the same phone number, email, names that are similar. </p>
                </template>
                <template #content>                    
                </template>
            </Card>            
        </div>
    </div>
</template>
  
<script>
    import { computed, ref, } from "vue";
    
    import { Card } from 'primevue';
  
    export default {
        components: {
            Card
        },
        setup() {
                
            return {
                
            }
        },        
    };
</script>
<style scoped>
</style>