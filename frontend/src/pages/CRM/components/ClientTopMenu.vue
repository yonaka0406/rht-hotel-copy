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
                <span class="w-32 sm:w-auto mr-2">{{ userGreeting }}</span>
                <template v-if="clientsIsLoading">                    
                    <Skeleton shape="circle" size="2rem" />
                </template>
                <template v-else>
                    <AutoComplete
                        v-model="client"
                        :suggestions="filteredClients"
                        optionLabel="display_name"
                        @complete="filterClients"                                            
                        @option-select="onClientSelect"                
                        placeholder="顧客検索" 
                        class="w-32 sm:w-auto" 
                    >
                        <template #option="slotProps">
                        <div>
                            <p>
                                <i v-if="slotProps.option.is_legal_person" class="pi pi-building"></i>
                                <i v-else class="pi pi-user"></i>
                                {{ slotProps.option.name_kanji || slotProps.option.name_kana || slotProps.option.name || '' }}
                                <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
                            </p>
                            <div class="flex items-center gap-2">
                                <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i class="pi pi-phone"></i> {{ slotProps.option.phone }}</p>
                                <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i class="pi pi-at"></i> {{ slotProps.option.email }}</p>
                                <p v-if="slotProps.option.fax" class="text-xs text-sky-800"><i class="pi pi-send"></i> {{ slotProps.option.fax }}</p>
                            </div>
                        </div>
                        </template>
                    </AutoComplete>
                </template>
                <router-link
                    to="/"
                    class="bg-emerald-500 hover:bg-emerald-600 p-2 block rounded-sm"
                >
                    <i class="pi pi-home text-white mr-2"></i>
                    <span class="text-white">PMS</span>
                </router-link>
                
            </div>
        </template>
    </Menubar>
</template>

<script setup>
    import { ref, computed, onMounted } from 'vue';
    import { useRouter } from 'vue-router';
    import { useUserStore } from '@/composables/useUserStore';
    import { useClientStore } from '@/composables/useClientStore';
    import { Menubar, InputText, AutoComplete, Skeleton} from 'primevue';

    const router = useRouter();
    const { logged_user, fetchUser } = useUserStore();
    const { clients, clientsIsLoading, fetchClients, setClientsIsLoading } = useClientStore();

    // Menubar
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
            label: 'ダッシュボード',
            icon: 'pi pi-chart-bar',
            route: '/crm/dashboard'                    
        },
        {
            label: '顧客情報',
            icon: 'pi pi-user',
            items: [                
                {
                    label: '顧客一覧',
                    route: '/crm/clients/all'
                },
                /*
                {
                    label: '顧客合流',
                    route: '/crm/clients/duplicates'
                }
                */
               {
                    label: '所属グループ一覧',
                    route: '/crm/groups/all'
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

    // Search
    const normalizeKana = (str) => {
        if (!str) return '';
        let normalizedStr = str.normalize('NFKC');
        
        // Convert Hiragana to Katakana
        normalizedStr = normalizedStr.replace(/[\u3041-\u3096]/g, (char) => 
        String.fromCharCode(char.charCodeAt(0) + 0x60)  // Convert Hiragana to Katakana
        );
        // Convert half-width Katakana to full-width Katakana
        normalizedStr = normalizedStr.replace(/[\uFF66-\uFF9F]/g, (char) => 
        String.fromCharCode(char.charCodeAt(0) - 0xFEC0)  // Convert half-width to full-width Katakana
        );
        
        return normalizedStr;
    };
    const normalizePhone = (phone) => {
        if (!phone) return '';

        // Remove all non-numeric characters
        let normalized = phone.replace(/\D/g, '');

        // Remove leading zeros
        normalized = normalized.replace(/^0+/, '');

        return normalized;
    };    
    const client = ref({});            
    const filteredClients = ref([]);
    const filterClients = (event) => {                
        const query = event.query.toLowerCase();
        const normalizedQuery = normalizePhone(query);
        const isNumericQuery = /^\d+$/.test(normalizedQuery);
        
        if (!query || !clients.value || !Array.isArray(clients.value)) {
            filteredClients.value = [];
            return;
        }

        filteredClients.value = clients.value.filter((client) => {
            // Name filtering (case-insensitive)
            const matchesName = 
                (client.name && client.name.toLowerCase().includes(query)) || 
                (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) || 
                (client.name_kanji && client.name_kanji.toLowerCase().includes(query));
            // Phone/Fax filtering (only for numeric queries)
            const matchesPhoneFax = isNumericQuery &&
                ((client.fax && normalizePhone(client.fax).includes(normalizedQuery)) || 
                (client.phone && normalizePhone(client.phone).includes(normalizedQuery)));
            // Email filtering (case-insensitive)
            const matchesEmail = client.email && client.email.toLowerCase().includes(query);

            // console.log('Client:', client, 'Query:', query, 'matchesName:', matchesName, 'matchesPhoneFax:', matchesPhoneFax, 'isNumericQuery', isNumericQuery, 'matchesEmail:', matchesEmail);

            return matchesName || matchesPhoneFax || matchesEmail;
        });
    };
    const onClientSelect = (event) => {
        client.value = event.value;
        client.value.display_name = event.value.name_kanji || event.value.name_kana || event.value.name;
        goToEditClientPage(client.value.id);
    };

    const goToEditClientPage = (clientId) => {        
        router.push({ name: 'ClientEdit', params: { clientId: clientId } });
    };

    onMounted( async () => {
        await fetchUser();                
        if(clients.value.length === 0) {
            setClientsIsLoading(true);
            const clientsTotalPages = await fetchClients(1);
            // Fetch clients for all pages
            for (let page = 2; page <= clientsTotalPages; page++) {
                await fetchClients(page);
            }
            setClientsIsLoading(false);            
        }
        
    });
</script>
<style scoped>
</style>