<template>
  <div class="forgot-password-container flex justify-center items-center min-h-screen bg-gray-100 p-4">
    <Card class="w-full max-w-md">
      <template #title>
        <h2 class="text-2xl font-bold mb-6 text-center">パスワード忘れた場合</h2>
      </template>
      <template #content>
        <form @submit.prevent="handleResetRequest">
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
            <small v-if="emailError" class="p-error">{{ emailError }}</small>
          </div>

          <div class="mb-4">
            <Button
              label="パスワードリセット"
              icon="pi pi-refresh"
              class="w-full !bg-emerald-800 !text-white !border-emerald-800 hover:!bg-emerald-700 hover:!border-emerald-700 focus:!bg-emerald-700 focus:!border-emerald-700"
              :loading="isLoading"
              type="submit"
            />
          </div>

          <div v-if="successMessage" class="text-center text-green-600 mt-4">
            {{ successMessage }}
          </div>
          <div v-if="errorMessage" class="text-center text-red-600 mt-4">
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
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();

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

  const handleResetRequest = async () => {
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
        body: JSON.stringify({ email: email.value })
      });
      const responseData = await response.json();
      
      if (!response.ok) {
        // Use error message from backend if available, otherwise a generic one
        throw new Error(responseData.message || 'サーバーエラーが発生しました。');
      }
      successMessage.value = responseData.message;
      // Example: toast.add({ severity: 'success', summary: '成功', detail: responseData.message, life: 3000 });

    } catch (error) {
      errorMessage.value = error.message || 'パスワードのリセット中にエラーが発生しました。もう一度お試しください。';
      // Example: toast.add({ severity: 'error', summary: 'エラー', detail: errorMessage.value, life: 3000 });
    } finally {
      isLoading.value = false;
    }
  };
</script>

<style scoped>
</style>
  