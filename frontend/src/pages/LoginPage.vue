<template>
  <div class="login-container flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
    <Card class="w-full max-w-md bg-white dark:bg-gray-900 dark:border-gray-700 shadow-lg dark:shadow-xl">

      <template #title>
        <img src="/logo.jpg" alt="Logo" class="block mx-auto mb-6 max-w-[150px] h-auto rounded-xl" />        
      </template>
      <template #content>
        <Message severity="warn" :closable="false" v-if="showBrowserWarning" class="mb-4">このウェブアプリケーションは、現在のブラウザに最適化されていません。最高の体験を得るには、Google ChromeまたはMicrosoft Edgeを使用してください。</Message>
        <form @submit.prevent="handleLogin">
          <div v-if="showPasswordLogin">
            <div class="field mb-6">
              <FloatLabel>
                <InputText
                id="email"
                v-model="email"
                fluid
                :class="{'p-invalid': emailError, 'dark:bg-gray-900 dark:text-white': true}"
                required
                @blur="validateEmail"
                autocomplete="email"
              />
              <label for="email" class="dark:text-gray-200">メールアドレス</label>
            </FloatLabel>
            <small v-if="emailError" class="p-error dark:text-red-300">{{ emailError }}</small>
          </div>

          <div class="field mb-6">  
            <FloatLabel>
              <Password
                id="password"                
                v-model="password"
                :feedback="false"
                toggleMask               
                class="w-full dark:bg-gray-900 dark:text-white"
                :class="{'p-invalid': passwordError}"
                type="password"
                required
                fluid
                @blur="validatePassword"
                autocomplete="current-password"
                aria-autocomplete="list"
              />
              <label for="password" class="dark:text-gray-200">パスワード</label>
            </FloatLabel>
            <small v-if="passwordError" class="p-error dark:text-red-300">{{ passwordError }}</small>
          </div>

          <div class="mb-4">
              <Button
                label="ログイン"
                icon="pi pi-sign-in"
                class="w-full !bg-emerald-800 !text-white !border-emerald-800 hover:!bg-emerald-700 hover:!border-emerald-700 focus:!bg-emerald-700 focus:!border-emerald-700 dark:!bg-emerald-900 dark:!border-emerald-900 dark:hover:!bg-emerald-800 dark:hover:!border-emerald-800"
                :loading="isLoading"
                type="submit"
              />
            </div>
            <!-- Forgot password link MOVED HERE -->
            <div class="text-center">
              <router-link to="/forgot-password" class="text-sm text-emerald-700 hover:text-emerald-600 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200">パスワードを忘れましたか？</router-link>
            </div>
          </div>

          <div class="my-4"> <!-- Added Google Sign-In Button -->
            <Button
              label="Google でログイン"
              icon="pi pi-google"
              class="w-full !bg-emerald-700 !text-white !border-emerald-700 hover:!bg-emerald-600 hover:!border-emerald-600 focus:!bg-emerald-600 focus:!border-emerald-600 dark:!bg-emerald-900 dark:!border-emerald-900 dark:hover:!bg-emerald-800 dark:hover:!border-emerald-800"
              @click="handleGoogleLogin"
            />
          </div>

          <!-- Toggle Button/Link for Email & Password -->
          <div class="my-4 text-center">
            <Button
              v-if="!showPasswordLogin"
              label="又はID＆PWでログイン"
              icon="pi pi-envelope"
              class="w-full !text-emerald-700 hover:!bg-emerald-700/[.05] focus:!bg-emerald-700/[.05] p-button-text dark:!text-emerald-300"
              @click="showPasswordLogin = !showPasswordLogin"
            />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<script setup>
  // Vue
  import { ref, onMounted } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  
  // Store
  import { useAuthStore } from '@/composables/useAuthStore';

  // Primevue
  import { useToast } from 'primevue/usetoast';
  import Card from 'primevue/card';
  import FloatLabel from 'primevue/floatlabel';
  import InputText from 'primevue/inputtext';
  import Password from 'primevue/password';
  import Button from 'primevue/button';
  import Message from 'primevue/message';

  const router = useRouter();
  const route = useRoute();
  const authStore = useAuthStore();
  const toast = useToast();

  const email = ref('');
  const password = ref('');
  const isLoading = ref(false);
  const emailError = ref(null);
  const passwordError = ref(null);
  const showPasswordLogin = ref(false);
  const showBrowserWarning = ref(false);

  // Handle error messages from URL parameters & Browser Check
  onMounted(() => {
    // Browser check
    const userAgent = navigator.userAgent;
    if (!userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      showBrowserWarning.value = true;
    }

    const errorParam = route.query.error;
    if (errorParam) {
      let message = '';
      let severity = 'warn';

      switch(errorParam) {
        case 'token_malformed':
          message = 'セッションが無効です。再度ログインしてください。';
          break;
        case 'token_expired':
          message = 'セッションの有効期限が切れました。再度ログインしてください。';
          break;
        case 'auth_failed':
          message = '認証に失敗しました。再度ログインしてください。';
          break;
        case 'google_auth_failed':
          message = 'Googleログインに失敗しました。再度お試しください。';
          severity = 'error';
          break;
        default:
          message = '再度ログインしてください。';
      }

      if (message) {
        toast.add({
          severity,
          summary: 'ログイン必要',
          detail: message,
          life: 5000
        });
      }

      // Clear the error parameter from URL
      router.replace({ query: {} });
    }
  });

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value) {
      emailError.value = 'メールアドレスは必須です。';
    } else if (!emailRegex.test(email.value)) {
      emailError.value = '無効なメール形式';
    } else {
      emailError.value = null;
    }
  };
  const validatePassword = () => {
    passwordError.value = password.value ? null : 'パスワードが必要です。';
  };

  const handleLogin = async () => {
    validateEmail();
    validatePassword();

    if (emailError.value || passwordError.value) {
      const detail = emailError.value || passwordError.value;
      toast.add({ severity: 'error', summary: '入力エラー', detail, life: 3000 });
      return;
    }

    isLoading.value = true;
    try {
        await authStore.login(email.value, password.value);
        toast.add({ severity: 'success', summary: 'ログイン成功', detail: 'ようこそ！', life: 3000 });
        router.push('/');
    } catch (error) {
        toast.add({ severity: 'error', summary: 'ログイン失敗', detail: error.message, life: 5000 });
    } finally {
        isLoading.value = false;
    }
  };

</script>

<style scoped>
</style>