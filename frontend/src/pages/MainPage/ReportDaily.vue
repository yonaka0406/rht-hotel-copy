<template>
    <div class="min-h-screen p-2">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-6">
                <template #title>
                    <p>法人・個人（性別）：パイグラフ</p>
                </template>
                <template #subtitle>
                    <p>All time statistics</p>
                </template>
                <template #content>                    
                </template>
            </Card>
            <Card class="flex col-span-6">
                <template #title>
                    <p>売上：縦バーグラフ</p>
                </template>
                <template #subtitle>
                    <p>1 year total</p>
                </template>
                <template #content>                    
                </template>
            </Card>
            <Card class="flex col-span-12">
                <template #title>
                    <p>最近登録された顧客：テーブル</p>
                </template>
                <template #subtitle>
                    <p>New clients registered from last month</p>
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