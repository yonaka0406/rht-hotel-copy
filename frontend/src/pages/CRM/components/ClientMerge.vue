<template>
    <div class="p-4">
        <h2 class="text-xl font-bold mb-4">顧客合流</h2>
  
        <Card class="p-4 border-2 border-blue-500">
            <template #title>合流結果選択</template>
            <template #content>
                <div v-if="mergedClient">
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">氏名・名称:</label>
                        <SelectButton
                            v-model="mergedClient.name"
                            :options="[newClient?.name, oldClient?.name]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.name }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">カナ:</label>
                        <SelectButton
                            v-model="mergedClient.name_kana"
                            :options="[newClient?.name_kana, oldClient?.name_kana]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.name_kana }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">漢字:</label>
                        <SelectButton
                            v-model="mergedClient.name_kanji"
                            :options="[newClient?.name_kanji, oldClient?.name_kanji]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.name_kanji }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">誕生日・設立日:</label>
                        <SelectButton
                            v-model="mergedClient.date_of_birth"
                            :options="[
                                newClient?.date_of_birth,
                                oldClient?.date_of_birth
                            ]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.date_of_birth === null ? null : formatDate(new Date(mergedClient.date_of_birth)) }}                            
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">個人・法人:</label>
                        <SelectButton
                            v-model="mergedClient.legal_or_natural_person"                            
                            optionLabel="label"
                            optionValue="value"
                            :options="[
                                {label: newClient?.legal_or_natural_person === 'natural' ? '個人' : '法人', value: newClient?.legal_or_natural_person},
                                {label: oldClient?.legal_or_natural_person === 'natural' ? '個人' : '法人', value: oldClient?.legal_or_natural_person}
                            ]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.legal_or_natural_person === 'natural' ? '個人' : '法人' }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">性別:</label>
                        <SelectButton
                            v-model="mergedClient.gender"
                            optionLabel="label"
                            optionValue="value"
                            :options="[
                                {label: newClient?.gender === 'male' ? '男性' : newClient?.gender === 'female' ? '女性' : 'その他', value: newClient?.gender},
                                {label: oldClient?.gender === 'male' ? '男性' : oldClient?.gender === 'female' ? '女性' : 'その他', value: oldClient?.gender}
                            ]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.gender === 'male' ? '男性' : mergedClient.gender === 'female' ? '女性' : 'その他'}}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">メールアドレス:</label>
                        <SelectButton
                            v-model="mergedClient.email"
                            :options="[newClient?.email, oldClient?.email]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.email }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">電話番号:</label>
                        <SelectButton
                            v-model="mergedClient.phone"
                            :options="[newClient?.phone, oldClient?.phone]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.phone }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">ファックス:</label>
                        <SelectButton
                            v-model="mergedClient.fax"
                            :options="[newClient?.fax, oldClient?.fax]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.fax }}
                        </p>
                    </div>
                </div>
            </template>
        </Card>
        <div class="flex justify-center items-center mt-4">
            <Button 
                @click="saveChanges()"
                severity="warn"
                class="p-button p-button-sm "
            >
                <i class="pi pi-pencil mr-2"></i>顧客合流
            </Button>
        </div>
        
    </div>
  </template>
  
<script setup>
    import { ref, watch, computed, onMounted } from 'vue';
    import { useClientStore } from '@/composables/useClientStore';
    import { Card, SelectButton, Button } from 'primevue';

    const props = defineProps({
        oldID: String,
        newID: String
    });

    const { fetchClient, fetchClients, setClientsIsLoading, mergeClientsCRM } = useClientStore();

    const oldClient = ref(null);
    const newClient = ref(null);
    const mergedClient = ref({
        name: null,
        name_kana: null,
        name_kanji: null,
        date_of_birth: null,
        legal_or_natural_person: null,
        gender: null,
        email: null,
        phone: null,
        fax: null,    
    });

    const formatDate = (date) => {        
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            console.error("Invalid Date object:", date);
            throw new Error("The provided input is not a valid Date object:");
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };
  // Fetch client data when props change
  const fetchData = async () => {
    if (props.oldID) {
      const response = await fetchClient(props.oldID);
      if (response && response.client) {
        oldClient.value = response.client.client;
        if(oldClient.value.date_of_birth){
            oldClient.value.date_of_birth = formatDate(new Date(oldClient.value.date_of_birth));
        } 
      } else {
        oldClient.value = null;
      }
    }
  
    if (props.newID) {
      const response = await fetchClient(props.newID);
      if (response && response.client) {
        newClient.value = response.client.client;
        if(newClient.value.date_of_birth){
            newClient.value.date_of_birth = formatDate(new Date(newClient.value.date_of_birth));
        } 
      } else {
        newClient.value = null;
      }
      // console.log('oldClient:',oldClient.value);
      // console.log('newClient:',newClient.value);
    }

    mergedClient.value.name = newClient.value.name || oldClient.value.name;
    mergedClient.value.name_kana = newClient.value.name_kana || oldClient.value.name_kana;
    mergedClient.value.name_kanji = newClient.value.name_kanji || oldClient.value.name_kanji;
    mergedClient.value.date_of_birth = newClient.value.date_of_birth || oldClient.value.date_of_birth;    
    mergedClient.value.legal_or_natural_person = newClient.value.legal_or_natural_person || oldClient.value.legal_or_natural_person;
    mergedClient.value.gender = newClient.value.gender || oldClient.value.gender;
    mergedClient.value.email = newClient.value.email || oldClient.value.email;
    mergedClient.value.phone = newClient.value.phone || oldClient.value.phone;
    mergedClient.value.fax = newClient.value.fax || oldClient.value.fax;

    // console.log('mergedClient:',mergedClient.value);

  };
  
  watch(() => [props.oldID, props.newID], fetchData, { immediate: true });

  const saveChanges = async() => {

    
    await mergeClientsCRM(props.newID, props.oldID, mergedClient.value);    
    
    setClientsIsLoading(true);
    const clientsTotalPages = await fetchClients(1);
    // Fetch clients for all pages
    for (let page = 2; page <= clientsTotalPages; page++) {
        await fetchClients(page);
    }
    setClientsIsLoading(false);
    
  };

  </script>