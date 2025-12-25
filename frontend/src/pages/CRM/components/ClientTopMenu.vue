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
                <ClientAutoCompleteWithStore v-model="client" @option-select="onClientSelect" placeholder="顧客検索"
                    class="w-32 sm:w-auto" :useFloatLabel="false" />
                <router-link to="/" class="bg-emerald-500 hover:bg-emerald-600 p-2 block rounded-sm">
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
import { Menubar } from 'primevue';
import ClientAutoCompleteWithStore from '@/components/ClientAutoCompleteWithStore.vue';

const router = useRouter();
const { logged_user, fetchUser } = useUserStore();
const { clients, clientsIsLoading, fetchClients, setClientsIsLoading } = useClientStore();

// Menubar
const userGreeting = computed(() => {
    const now = new Date();
    const hour = now.getHours();
    const name = logged_user.value?.[0]?.name || '';

    if (hour >= 5 && hour < 10) {
        return 'おはようございます、' + name;
    } else if (hour >= 10 && hour < 17) {
        return 'こんにちは、' + name;
    } else {
        return 'こんばんは、' + name;
    }
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
            {
                label: '顧客合流',
                route: '/crm/clients/duplicates'
            },
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
            {
                label: 'PJ・工事一覧',
                route: { name: 'ProjectListAll' }
            }
        ]
    },
]);

// Search
const client = ref({});
const onClientSelect = (event) => {
    client.value = event.value;
    client.value.display_name = event.value.name_kanji || event.value.name_kana || event.value.name;
    goToEditClientPage(client.value.id);
};

const goToEditClientPage = (clientId) => {
    router.push({ name: 'ClientEdit', params: { clientId: clientId } });
};

onMounted(async () => {
    await fetchUser();
    if (clients.value.length === 0) {
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
<style scoped></style>