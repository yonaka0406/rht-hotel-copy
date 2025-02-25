<template>
    <div class="min-h-screen">
        <div class="grid grid-cols-12 gap-4">            
            <Card class="flex col-span-12">
                <template #title>
                    <p>顧客一覧：テーブル</p>
                </template>
                <template #subtitle>
                    <p>All clients list with some kind of lazy loading or filter search</p>
                </template>
                <template #content>                    
                </template>
            </Card>            
        </div>
    </div>
</template>
  
<script>
    import { ref, onMounted } from "vue";
    import { useRouter } from 'vue-router';
    import { useClientStore } from '@/composables/useClientStore';
    import { Card } from 'primevue';

  
    export default {
        components: {
            Card
        },
        setup() {
            const router = useRouter();
            const { clients, fetchClients } = useClientStore();

            onMounted( async () => {    
                if(clients.value.length === 0) {
                    await fetchClients();
                }                
                console.log('Clients:', clients.value);
            });

            return {
                
            }
        },        
    };
</script>
<style scoped>
</style>