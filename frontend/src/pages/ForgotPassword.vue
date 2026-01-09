<template>
  <div class="forgot-password-container flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
    <ConfirmDialog group="forgotPassword" />
    <Card class="w-full max-w-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:shadow-gray-900/50">
      <template #title>
        <h2 class="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">パスワード忘れた場合</h2>
      </template>
      <template #content>
        <form @submit.prevent="handleResetRequest(false)">
          <div class="mb-6">
            <FloatLabel>
              <InputText
                id="email"
                v-model="email"
                class="w-full"
                :class="{'p-invalid': emailError}"
                required
                @blur="validateEmail"
              />
              <label for="email">メールアドレス</label>
            </FloatLabel>
            <small v-if="emailError" class="p-error dark:text-red-400">{{ emailError }}</small>
          </div>

          <div class="mb-4">
            <Button
              label="パスワードリセット"
              icon="pi pi-refresh"
              class="w-full !bg-emerald-800 !text-white !border-emerald-800 hover:!bg-emerald-700 hover:!border-emerald-700 focus:!bg-emerald-700 focus:!border-emerald-700 dark:!bg-emerald-900 dark:!border-emerald-900 dark:hover:!bg-emerald-800 dark:hover:!border-emerald-800"
              :loading="isLoading"
              type="submit"
            />
          </div>

          <div v-if="successMessage" class="text-center text-green-600 dark:text-green-400 mt-4">
            {{ successMessage }}
          </div>
          <div v-if="errorMessage" class="text-center text-red-600 dark:text-red-400 mt-4">
            {{ errorMessage }}
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<script setup>
  // Vue
  import { ref } from 'vue';

  // PrimeVue components
  import InputText from 'primevue/inputtext';   
  import FloatLabel from 'primevue/floatlabel';
  import Card from 'primevue/card';
  import Button from 'primevue/button';  
  import ConfirmDialog from 'primevue/confirmdialog';
  import { useToast } from 'primevue/usetoast';
  import { useConfirm } from 'primevue/useconfirm';

  const toast = useToast();
  const confirm = useConfirm();

  // Reactive state (equivalent to data())
  const email = ref('');
  const emailError = ref(null);
  const successMessage = ref(null);
  const errorMessage = ref(null);
  const isLoading = ref(false);

  // Methods
  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value) {
      emailError.value = 'メールアドレス必須';
    } else if (!emailRegex.test(email.value)) {
      emailError.value = '無効なメールアドレス';
    } else {
      emailError.value = null;
    }
  };

  const handleResetRequest = async (forceResetArg = false) => {
    const forceReset = forceResetArg === true;
    validateEmail();
    if (emailError.value) {      
      toast.add({ severity: 'error', summary: '入力エラー', detail: emailError.value, life: 3000 });
      return;
    }

    isLoading.value = true;
    successMessage.value = null;
    errorMessage.value = null;

    try {
      // Using fetch API directly:
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value, forceReset })
      });
      const responseData = await response.json();
      
      if (!response.ok) {
        if (responseData.isGoogleAccount) {
          isLoading.value = false;
          confirm.require({
            group: 'forgotPassword',
            message: 'このアカウントはGoogleで登録されています。パスワード認証（ローカルアカウント）に切り替えて、リセットメールを送信しますか？',
            header: 'アカウント種別の変更確認',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'はい（切り替える）',
            rejectLabel: 'いいえ',
            acceptProps: { severity: 'warn' },
            rejectProps: { severity: 'secondary', outlined: true },
            accept: () => {
              handleResetRequest(true);
            },
            reject: () => {
              errorMessage.value = responseData.error || responseData.message;
            }
          });
          return;
        }
        // Use error message from backend if available, otherwise a generic one
        throw new Error(responseData.error || responseData.message || 'サーバーエラーが発生しました。');
      }
      successMessage.value = responseData.message;
      toast.add({ severity: 'success', summary: '成功', detail: responseData.message, life: 5000 });

    } catch (error) {
      errorMessage.value = error.message || 'パスワードのリセット中にエラーが発生しました。もう一度お試しください。';
      toast.add({ severity: 'error', summary: 'エラー', detail: errorMessage.value, life: 5000 });
    } finally {
      isLoading.value = false;
    }
  };
</script>

<style scoped>
</style>
  