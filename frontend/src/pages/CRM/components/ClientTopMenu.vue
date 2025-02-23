<template>    
    <Menubar :model="items">
        <template #start>
            <img src="/crm.svg" alt="CRM Icon" class="h-8" />
        </template>
        <template #item="{ item, props, hasSubmenu }">
            <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
                <a v-ripple :href="href" v-bind="props.action" @click="navigate">
                    <span :class="item.icon" />
                    <span>{{ item.label }}</span>
                </a>
            </router-link>
            <a v-else v-ripple :href="item.url" :target="item.target" v-bind="props.action">
                <span :class="item.icon" />
                <span>{{ item.label }}</span>
                <span v-if="hasSubmenu" class="pi pi-fw pi-angle-down" />
            </a>
        </template>
        <template #end>
            <div class="flex items-center gap-2">
                <InputText placeholder="検索" type="text" class="w-32 sm:w-auto" />                
            </div>
        </template>
    </Menubar>
</template>

<script>
    import { ref, computed, watch, onMounted } from 'vue';
    import { useRouter } from 'vue-router';
    import { useUserStore } from '@/composables/useUserStore';
    import { Menubar, InputText, Avatar } from 'primevue';
    export default {
        components: {
            Menubar,
            InputText,
            Avatar,
        },
        setup() {     
            const router = useRouter();       
            const { logged_user, fetchUser } = useUserStore();
            const userMessage = ref('');

            const userGreeting = computed(() => {
                const now = new Date();
                const hour = now.getHours();

                if (hour >= 5 && hour < 10) {
                    userMessage.value = 'おはようございます、' + logged_user.value[0]?.name;
                    // Good morning (5:00 AM - 9:59 AM)
                } else if (hour >= 10 && hour < 17) {
                    userMessage.value = 'こんにちは、' + logged_user.value[0]?.name;
                    // Good afternoon (10:00 AM - 4:59 PM)
                } else {
                    userMessage.value = 'こんばんは、' + logged_user.value[0]?.name;
                    // Good evening (5:00 PM - 4:59 AM)
                }
                
                return userMessage;
            });

            const items = ref([
                {
                    label: '顧客情報',
                    icon: 'pi pi-user',
                    items: [
                        {
                            label: '顧客一覧',
                            route: '/crm/clients/all'
                        },
                        {
                            label: '顧客合流',
                            route: '/crm/clients/duplicates'
                        }
                    ]
                },
                {
                    label: '営業活動',
                    icon: 'pi pi-crown',
                    items: [
                        {
                            label: 'やり取り一覧',
                            route: '/crm/sales/interactions'
                        },                        
                    ]
                },                
            ]);

            onMounted( async () => {
           
            });


            return{   
                logged_user,             
                userGreeting,
                items,
            };
        },
    };
</script>
<style scoped>
</style>