<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-12 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                <template #title>
                    顧客重複チェック
                </template>
                <template #subtitle>
                    顧客を合流すると、予約データにも影響があります。
                </template>
                <template #content>
                    <!-- Loading indicator -->
                    <div v-if="clientsIsLoading">
                        <!-- You can use a more complex skeleton loader like in ClientList.vue if you prefer -->
                        <p>データを読み込み中...</p>
                    </div>
                    <!-- Content displayed after data has finished loading -->
                    <div v-else>
                        <DataTable class="dark:bg-gray-800 dark:text-gray-200 p-datatable-sm" :value="duplicatePairs"
                            :paginator="true" :rows="5" :rowsPerPageOptions="[5, 10, 20]"
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                            v-if="duplicatePairs.length > 0">
                            <Column header="元顧客情報">
                                <template #body="{ data }">
                                    <div class="grid grid-cols-2 flex flex-col gap-1">
                                        <div class="flex items-center col-span-2">
                                            <Button @click="goToEditClientPage(data.earliest.id)" severity="info"
                                                class="p-button-rounded p-button-sm">
                                                <i class="pi pi-pencil mr-2"></i>顧客編集
                                            </Button>
                                        </div>
                                        <div class="flex items-center gap-2" v-tooltip="'氏名・名称'">
                                            <i class="pi pi-user text-xs" />
                                            <span class="text-xs">{{ data.earliest.name }}</span>
                                        </div>
                                        <div class="flex items-center gap-2" v-tooltip="'カナ'">
                                            <i class="pi pi-align-left text-xs" />
                                            <span class="text-xs">{{ data.earliest.name_kana }}</span>
                                        </div>
                                        <div class="flex items-center gap-2" v-tooltip="'漢字'">
                                            <i class="pi pi-language text-xs" />
                                            <span class="text-xs">{{ data.earliest.name_kanji }}</span>
                                        </div>
                                        <div class="flex items-center gap-2" v-tooltip="'誕生日・設立日'">
                                            <i class="pi pi-calendar text-xs" />
                                            <span class="text-xs">{{ data.earliest.date_of_birth === null ? 'N/A' :
                                                formatDate(new Date(data.earliest.date_of_birth)) }}</span>
                                        </div>
                                        <div class="flex items-center gap-2" v-tooltip="'法人・個人'">
                                            <i class="pi pi-users text-xs" />
                                            <span class="text-xs">{{ data.earliest.legal_or_natural_person === 'natural'
                                                ? '個人' : '法人' }}</span>
                                        </div>
                                        <div class="flex items-center gap-2" v-tooltip="'性別'">
                                            <i class="pi pi-venus text-xs" /><i class="pi pi-mars text-xs" />
                                            <span class="text-xs">{{ data.earliest.gender === 'male' ? '男性' :
                                                data.earliest.gender === 'female' ? '女性' : 'その他' }}</span>
                                        </div>
                                        <div class="flex items-center gap-2" v-tooltip="'メールアドレス'">
                                            <i class="pi pi-envelope text-xs" />
                                            <span class="text-xs">{{ data.earliest.email }}</span>
                                        </div>
                                        <div class="flex items-center gap-2" v-tooltip="'電話番号'">
                                            <i class="pi pi-phone text-xs" />
                                            <span class="text-xs">{{ data.earliest.phone }}</span>
                                        </div>
                                        <div class="flex items-center gap-2" v-tooltip="'ファックス'">
                                            <i class="pi pi-print text-xs" />
                                            <span class="text-xs">{{ data.earliest.fax || 'N/A' }}</span>
                                        </div>
                                        <div class="flex items-center gap-2" v-tooltip="'作成日時'">
                                            <i class="pi pi-clock text-xs" />
                                            <span class="text-xs">{{ formatDateTime(data.earliest.created_at) }}</span>
                                        </div>
                                    </div>
                                </template>
                            </Column>
                            <Column header="重複候補者">
                                <template #body="{ data }">
                                    <ul class="p-2">
                                        <li v-for="duplicate in data.duplicates" :key="duplicate.id" class="mb-2">
                                            <div class="grid grid-cols-2 flex flex-col gap-1">
                                                <div class="flex items-center gap-2" v-tooltip="'氏名・名称'">
                                                    <i class="pi pi-user text-xs" />
                                                    <span class="text-xs">{{ duplicate.name }}</span>
                                                </div>
                                                <div class="flex items-center gap-2" v-tooltip="'カナ'">
                                                    <i class="pi pi-align-left text-xs" />
                                                    <span class="text-xs">{{ duplicate.name_kana }}</span>
                                                </div>
                                                <div class="flex items-center gap-2" v-tooltip="'漢字'">
                                                    <i class="pi pi-language text-xs" />
                                                    <span class="text-xs">{{ duplicate.name_kanji }}</span>
                                                </div>
                                                <div class="flex items-center gap-2" v-tooltip="'誕生日・設立日'">
                                                    <i class="pi pi-calendar text-xs" />
                                                    <span class="text-xs">{{ duplicate.date_of_birth === null ? 'N/A' :
                                                        formatDate(new Date(duplicate.date_of_birth)) }}</span>
                                                </div>
                                                <div class="flex items-center gap-2" v-tooltip="'法人・個人'">
                                                    <i class="pi pi-users text-xs" />
                                                    <span class="text-xs">{{ duplicate.legal_or_natural_person ===
                                                        'natural' ? '個人' : '法人' }}</span>
                                                </div>
                                                <div class="flex items-center gap-2" v-tooltip="'性別'">
                                                    <i class="pi pi-venus text-xs" /><i class="pi pi-mars text-xs" />
                                                    <span class="text-xs">{{ duplicate.gender === 'male' ? '男性' :
                                                        duplicate.gender === 'female' ? '女性' : 'その他' }}</span>
                                                </div>
                                                <div class="flex items-center gap-2" v-tooltip="'メールアドレス'">
                                                    <i class="pi pi-envelope text-xs" />
                                                    <span class="text-xs">{{ duplicate.email }}</span>
                                                </div>
                                                <div class="flex items-center gap-2" v-tooltip="'電話番号'">
                                                    <i class="pi pi-phone text-xs" />
                                                    <span class="text-xs">{{ duplicate.phone }}</span>
                                                </div>
                                                <div class="flex items-center gap-2" v-tooltip="'ファックス'">
                                                    <i class="pi pi-print text-xs" />
                                                    <span class="text-xs">{{ duplicate.fax || 'N/A' }}</span>
                                                </div>
                                                <div class="flex items-center gap-2" v-tooltip="'作成日時'">
                                                    <i class="pi pi-clock text-xs" />
                                                    <span class="text-xs">{{ formatDateTime(duplicate.created_at)
                                                        }}</span>
                                                </div>
                                                <div class="flex items-center">
                                                    <Button @click="goToEditClientPage(duplicate.id)" severity="info"
                                                        class="p-button-rounded p-button-sm">
                                                        <i class="pi pi-pencil mr-2"></i>顧客編集
                                                    </Button>
                                                </div>
                                                <div class="flex items-center">
                                                    <Button @click="mergeClients(duplicate.id)" severity="warn"
                                                        class="p-button-rounded p-button-sm">
                                                        <i class="pi pi-pencil mr-2"></i>顧客合流
                                                    </Button>
                                                </div>
                                            </div>
                                            <Divider />
                                        </li>
                                    </ul>
                                </template>
                            </Column>
                        </DataTable>
                        <div v-else class="p-4">
                            <p>重複候補見つかりませんでした。</p>
                        </div>
                    </div>
                </template>
            </Card>
        </div>
    </div>

    <Drawer v-model:visible="showDrawer" class="dark:bg-gray-800 dark:text-gray-200" modal :position="'bottom'"
        :style="{ height: '75vh' }" closable>
        <ClientMerge :newID="drawerProps.newClientId" :oldID="drawerProps.oldClientId" />
    </Drawer>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue"; // DEBUG: Added onMounted
import { useRouter } from 'vue-router';
import ClientMerge from './components/ClientMerge.vue';
import { useClientStore } from '@/composables/useClientStore';
// PrimeVue component imports
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Divider from 'primevue/divider';
import Button from 'primevue/button';
import Drawer from 'primevue/drawer';

const router = useRouter();
const { clients, clientsIsLoading, mergeClientsCRM } = useClientStore();

// DEBUG: Log component mount
onMounted(() => {
    console.log('[ClientDuplicates] Component mounted.');
    console.log(`[ClientDuplicates] Initial loading state: ${clientsIsLoading.value}`);
    console.log(`[ClientDuplicates] Initial clients count: ${clients.value ? clients.value.length : 0}`);
});

const findPotentialDuplicates = (client, clientsArray) => {
    if (!client || !Array.isArray(clientsArray)) return [];

    const normalizeString = (str) => {
        if (!str) return '';
        return str.toLowerCase().replace(/\s+/g, '');
    };

    const isSimilarName = (name1, name2) => {
        if (!name1 || !name2) return false;

        const normalized1 = normalizeString(name1);
        const normalized2 = normalizeString(name2);

        if (normalized1 === normalized2) return true;

        const maxLength = Math.max(normalized1.length, normalized2.length);
        const distance = levenshteinDistance(normalized1, normalized2);
        return distance <= 2 && distance / maxLength < 0.3;
    };

    const levenshteinDistance = (a, b) => {
        const matrix = Array(b.length + 1).fill(null)
            .map(() => Array(a.length + 1).fill(null));

        for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }
        return matrix[b.length][a.length];
    };

    const matchCriteria = {
        name: { weight: 2, check: (a, b) => isSimilarName(a, b) },
        name_kana: { weight: 2, check: (a, b) => isSimilarName(a, b) },
        name_kanji: { weight: 2, check: (a, b) => isSimilarName(a, b) },
        phone: { weight: 3, check: (a, b) => a && a === b },
        fax: { weight: 2, check: (a, b) => a && a === b },
        email: { weight: 3, check: (a, b) => a && a === b },
        date_of_birth: {
            weight: 4,
            check: (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString()
        }
    };

    return clientsArray.filter((c) => {
        if (c.id === client.id ||
            c.legal_or_natural_person !== client.legal_or_natural_person ||
            c.gender !== client.gender) {
            return false;
        }

        const reasons = Object.entries(matchCriteria)
            .reduce((acc, [key, { check }]) => {
                if (check(client[key], c[key])) {
                    acc.push(key);
                }
                return acc;
            }, []);

        return reasons.length > 0;
    });
};

const clientsWithPotentialDuplicates = computed(() => {
    console.log('[ClientDuplicates] Computing clientsWithPotentialDuplicates...');
    if (!clients.value || !Array.isArray(clients.value)) {
        console.log('[ClientDuplicates] clients data not ready. Returning empty array.');
        return [];
    }
    console.time('[ClientDuplicates] clientsWithPotentialDuplicates calculation time');
    const result = clients.value.filter((client) => {
        return findPotentialDuplicates(client, clients.value).length > 0;
    });
    console.timeEnd('[ClientDuplicates] clientsWithPotentialDuplicates calculation time');
    console.log(`[ClientDuplicates] Found ${result.length} clients with potential duplicates.`);
    return result;
});

const getEarliestEntries = (clientsArray) => {
    const earliestEntries = [];

    clientsArray.forEach((client) => {
        const duplicates = findPotentialDuplicates(client, clientsArray);
        if (duplicates.length > 0) {
            let earliest = client;
            duplicates.forEach((duplicate) => {
                if (new Date(duplicate.created_at) < new Date(earliest.created_at)) {
                    earliest = duplicate;
                }
            });
            if (!earliestEntries.some(e => e.id === earliest.id)) {
                earliestEntries.push(earliest);
            }
        }
    });

    return earliestEntries;
};

const earliestEntries = computed(() => {
    console.log('[ClientDuplicates] Computing earliestEntries...');
    console.time('[ClientDuplicates] earliestEntries calculation time');
    const result = getEarliestEntries(clientsWithPotentialDuplicates.value);
    console.timeEnd('[ClientDuplicates] earliestEntries calculation time');
    console.log(`[ClientDuplicates] Found ${result.length} earliest entries.`);
    return result;
});

const getDuplicatePairs = () => {
    const pairs = [];

    earliestEntries.value.forEach((earliest) => {
        const duplicates = findPotentialDuplicates(earliest, clientsWithPotentialDuplicates.value);
        if (duplicates.length > 0) {
            pairs.push({
                earliest: earliest,
                duplicates: duplicates,
            });
        }
    });

    return pairs;
};
const duplicatePairs = computed(() => {
    console.log('[ClientDuplicates] Computing duplicatePairs...');
    console.time('[ClientDuplicates] duplicatePairs calculation time');
    const result = getDuplicatePairs();
    console.timeEnd('[ClientDuplicates] duplicatePairs calculation time');
    console.log(`[ClientDuplicates] Created ${result.length} duplicate pairs for display.`);
    return result;
});

const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error("[ClientDuplicates] Invalid Date object provided to formatDate:", date);
        return 'Invalid Date';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

const goToEditClientPage = (clientId) => {
    router.push({ name: 'ClientEdit', params: { clientId: clientId } });
};

const showDrawer = ref(false);
const drawerProps = ref({});
const mergeClients = async (oldId) => {
    const pair = duplicatePairs.value.find(pair =>
        pair.duplicates.some(dup => dup.id === oldId)
    );

    if (!pair) {
        console.warn('[ClientDuplicates] No matching earliest client found for merge:', oldId);
        return;
    }

    const newClientId = pair.earliest.id;

    showDrawer.value = true;
    drawerProps.value = { oldClientId: oldId, newClientId };
};

watch(clientsIsLoading, (isLoading, wasLoading) => {
    console.log(`[ClientDuplicates] Loading state changed from ${wasLoading} to ${isLoading}`);
    if (isLoading) {
        showDrawer.value = false;
    } else {
        // This will trigger the computed properties to re-evaluate with the new client data
        console.log(`[ClientDuplicates] Loading finished. Clients count: ${clients.value ? clients.value.length : 0}`);
    }
});

</script>
<style scoped>
/* Scoped styles here */
</style>
