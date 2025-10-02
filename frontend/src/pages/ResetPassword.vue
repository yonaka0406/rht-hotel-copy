<template>
    <div class="reset-password-container flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card class="w-full max-w-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:shadow-gray-900/50">
        <template #title>
          <h2 class="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">パスワードリセット</h2>
        </template>
        <template #content>
          <form @submit.prevent="handleResetPassword">
            <div class="field mb-6">
              <FloatLabel>
                <Password
                  id="password"
                  v-model="password"
                  toggleMask
                  feedback
                  promptLabel="パスワードを決めて下さい"
                  weakLabel="単純すぎる"
                  mediumLabel="平均的な複雑さ"
                  strongLabel="複雑なパスワード"
                  class="w-full"
                  :class="{'p-invalid': passwordError}"
                  type="password"
                  required
                  fluid 
                  @blur="validatePassword()"
                >
                    <template #header>
                        <div class="font-semibold text-xm mb-4 text-gray-800 dark:text-gray-200">パスワードを選択してください。</div>
                    </template>
                    <template #footer>
                        <Divider />
                        <ul class="pl-2 ml-2 my-0 leading-normal">
                            <li class="text-gray-700 dark:text-gray-300">少なくとも1つの小文字</li>
                            <li class="text-gray-700 dark:text-gray-300">少なくとも1つの大文字</li>
                            <li class="text-gray-700 dark:text-gray-300">少なくとも1つの数値</li>
                            <li class="text-gray-700 dark:text-gray-300">最低8文字</li>
                        </ul>
                    </template>
                </Password>
                <label for="password">新しいパスワード</label>
              </FloatLabel>
              <small v-if="passwordError" class="p-error dark:text-red-400">{{ passwordError }}</small>
            </div>
  
            <div class="field mb-6">
              <FloatLabel>                
                <Password
                    id="confirmPassword"
                    v-model="confirmPassword"                    
                    toggleMask
                    class="w-full"
                    :class="{'p-invalid': confirmPasswordError}"
                    type="password"
                    required
                    fluid 
                    @blur="validatePassword()"
                >
                </Password>
                <label for="confirmPassword">パスワードを再入力</label>
              </FloatLabel>
              <small v-if="confirmPasswordError" class="p-error dark:text-red-400">{{ confirmPasswordError }}</small>
            </div>
  
            <div class="mb-4">
              <Button
                label="パスワードリセット"
                icon="pi pi-check"
                class="w-full dark:!bg-emerald-900 dark:!border-emerald-900 dark:hover:!bg-emerald-800 dark:hover:!border-emerald-800"
                :loading="isLoading"
                type="submit"
              />
            </div>
  
            <div v-if="errorMessage" class="text-center text-red-600 dark:text-red-400">
              {{ errorMessage }}
            </div>
            <div v-if="successMessage" class="text-center text-green-600 dark:text-green-400">
              {{ successMessage }}
            </div>
          </form>
        </template>
      </Card>
    </div>
  </template>
  
  <script setup>
    import { ref } from "vue"; 
    import { useToast } from 'primevue/usetoast';
    import { useRoute } from 'vue-router';

    import Password from 'primevue/password';
    import FloatLabel from 'primevue/floatlabel';
    import Card from 'primevue/card';
    import Button from 'primevue/button';
    import Divider from 'primevue/divider';

    const toast = useToast();
    const route = useRoute();

    const password = ref('');
    const confirmPassword = ref('');
    const passwordError = ref(null);
    const confirmPasswordError = ref(null);
    const isLoading = ref(false);
    const successMessage = ref(null);
    const errorMessage = ref(null);

    const validatePassword = () => {   
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

        if (!password.value) {
            passwordError.value = "パスワードが必要です。";
        } else if (!passwordRegex.test(password.value)) {
            passwordError.value = "パスワードには少なくとも 8 文字、大文字 1 文字、小文字 1 文字、数字 1 文字を含める必要があります。";
        } else {
            passwordError.value = null;
        }

        if (password.value && confirmPassword.value !== password.value) {
            confirmPasswordError.value = 'パスワードが一致しません。';
        } else {
            confirmPasswordError.value = null;
        }
    };

    const handleResetPassword = async () => {
        validatePassword();
        if (passwordError.value || confirmPasswordError.value) {
            const detail = passwordError.value || confirmPasswordError.value;
            toast.add({ severity: 'error', summary: '入力エラー', detail, life: 3000 });
            return;
        }

        isLoading.value = true;
        errorMessage.value = null;
        successMessage.value = null;

        try {
            const token = route.query.token;
            
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: password.value })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'サーバーエラーが発生しました。');
            }

            successMessage.value = responseData.message;
            toast.add({ severity: 'success', summary: '成功', detail: responseData.message, life: 5000 });

        } catch (error) {
            errorMessage.value = error.message || 'パスワードのリセット中にエラーが発生しました。もう一度お試しください。';
            toast.add({ severity: 'error', summary: 'エラー', detail: errorMessage.value, life: 3000 });
        } finally {
            isLoading.value = false;
        }
    };
  </script>
  
  <style scoped>

  </style>
  