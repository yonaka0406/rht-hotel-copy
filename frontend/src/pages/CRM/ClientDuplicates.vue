<template>
    <div class="min-h-screen">
        <div class="grid grid-cols-12 gap-4">            
            <Card class="flex col-span-12">
                <template #title>
                    顧客重複チェック
                </template>
                <template #subtitle>
                    
                </template>
                <template #content>  
                    <div v-if="duplicatePairs.length > 0">
                        <Splitter v-for="pair in duplicatePairs" :key="pair.earliest.id">
                        <SplitterPanel :size="50">
                            <p>Name: {{ pair.earliest.name }}</p>
                            <p>Phone: {{ pair.earliest.phone }}</p>
                        </SplitterPanel>
                        <SplitterPanel :size="50">
                            <ul>
                            <li v-for="duplicate in pair.duplicates" :key="duplicate.id">
                                <p>Name: {{ duplicate.name }}</p>
                                <p>Phone: {{ duplicate.phone }}</p>
                                <Divider />
                            </li>
                            </ul>
                        </SplitterPanel>
                        </Splitter>
                    </div>
                    <div v-else>
                        <p>No duplicate pairs found.</p>
                    </div>    
                </template>
            </Card>            
        </div>
    </div>
</template>
  
<script setup>
    import { ref, computed, onMounted } from "vue";
    import { useRouter } from 'vue-router';
    import { useClientStore } from '@/composables/useClientStore';
    import { Card, Splitter, SplitterPanel, Divider } from 'primevue';

    const router = useRouter();
    const { clients, clientsIsLoading } = useClientStore();

    const findPotentialDuplicates = (client, clientsArray) => {
        return clientsArray.filter((c) => {
            if (c.id === client.id) return false; // Exclude the client itself

            const reasons = [];

            if (c.legal_or_natural_person === client.legal_or_natural_person) {
                if (c.gender === client.gender) {
                    if (c.name === client.name && client.name) reasons.push('name');
                    if (c.name_kana === client.name_kana && client.name_kana) reasons.push('name_kana');
                    if (c.name_kanji === client.name_kanji && client.name_kanji) reasons.push('name_kanji');
                    if (c.phone === client.phone && client.phone) reasons.push('phone');
                    if (c.fax === client.fax && client.fax) reasons.push('fax');
                    if (c.email === client.email && client.email) reasons.push('email');
                    if (new Date(c.date_of_birth).toDateString() === new Date(client.date_of_birth).toDateString() && reasons.length > 0) reasons.push('date_of_birth');
                } else {
                    return false;
                }
            } else {
                return false;
            }

            

            if (reasons.length > 0) {
                console.log(`Potential duplicate found for client ${client.name} and ${c.name} due to: ${reasons.join(', ')}`);
                return true;
            }

            return false;
        });
    };
    const clientsWithPotentialDuplicates = computed(() => {
        return clients.value.filter((client) => {
            return findPotentialDuplicates(client, clients.value).length > 0;
        });
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

    const earliestEntries = computed(() => getEarliestEntries(clientsWithPotentialDuplicates.value));

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

    const duplicatePairs = computed(getDuplicatePairs);

    const goToEditClientPage = (clientId) => {
        router.push({ name: 'ClientEdit', params: { clientId: clientId } });
    };

    onMounted( async () => {  
        
    });

</script>
<style scoped>
</style>