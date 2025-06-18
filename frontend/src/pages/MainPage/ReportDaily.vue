<template>
    <div class="min-h-screen p-2">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-6">
                <template #title>
                    <p>法人・個人（性別）：パイグラフ</p>
                </template>
                <template #subtitle>
                    <p>全期間統計</p>
                </template>
                <template #content>                    
                </template>
            </Card>
            <Card class="flex col-span-6">
                <template #title>
                    <p>売上：縦バーグラフ</p>
                </template>
                <template #subtitle>
                    <p>年間合計</p>
                </template>
                <template #content>                    
                </template>
            </Card>
            <Card class="flex col-span-12">
                <template #title>
                    <p>最近登録された顧客：テーブル</p>
                </template>
                <template #subtitle>
                    <p>先月以降に登録された新規顧客</p>
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