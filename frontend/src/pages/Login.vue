<template>
  <div class="login-container flex justify-center items-center min-h-screen bg-gray-100 p-4">
    <Card class="w-full max-w-md">
      <template #title>
        <h2 class="text-2xl font-bold mb-6 text-center">ログイン</h2>
      </template>
      <template #content>
        <form @submit.prevent="handleLogin">
          <div class="field mb-6">   
            <FloatLabel>
              <InputText
                id="email"
                v-model="email"
                fluid
                :class="{'p-invalid': emailError}"
                required
                @blur="validateEmail"
              />
              <label for="email">メールアドレス</label>
            </FloatLabel>
            <small v-if="emailError" class="p-error">{{ emailError }}</small>
          </div>

          <div class="field mb-6">  
            <FloatLabel>
              <Password
                id="password"                
                v-model="password"
                :feedback="false"
                toggleMask               
                class="w-full"
                :class="{'p-invalid': passwordError}"
                type="password"
                required
                fluid
                @blur="validatePassword"
              />
              <label for="password">パスワード</label>
            </FloatLabel>
            <small v-if="passwordError" class="p-error">{{ passwordError }}</small>
          </div>

          <div class="mb-4">
            <Button
              label="ログイン"
              icon="pi pi-sign-in"
              class="w-full"
              :loading="isLoading"
              type="submit"
            />
          </div>

          <div class="text-center">
            <router-link to="/forgot-password" class="text-sm text-blue-600">パスワードを忘れましたか？</router-link>
          </div>
        </form>
      </template>
    </Card>  
  </div>
</template>

<script setup>
  // Vue
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  const router = useRouter();

  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();
  import { Card, FloatLabel, InputText, Password, Button } from 'primevue';

  const email = ref('');
  const password = ref('');
  const error = ref(null);
  const isLoading = ref(false);
  const emailError = ref(null);
  const passwordError = ref(null);

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

    if (emailError.value) {
      toast.add({ severity: 'error', summary: '入力エラー', detail: emailError.value, life: 3000 });
      return;
    }
    
    if (passwordError.value) {
      toast.add({ severity: 'error', summary: '入力エラー', detail: passwordError.value, life: 3000 });
      return;
    }

    try {
      error.value = null;
      isLoading.value = true;

      const data = {
        email: email.value,
        password: password.value,
      };
      
      const url = `/api/auth/login`;
      const response = await fetch(url, {
          method: 'POST',
          headers: {              
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
      }); 

      const responseData = await response.json();

      if (responseData.token) {
        // ✅ Successful login
        localStorage.setItem('authToken', responseData.token);
        toast.add({ severity: 'success', summary: 'ログイン成功', detail: responseData.message || 'ログインしました。', life: 3000 });
        router.push('/');
      } else if(responseData.error){
        toast.add({ severity: 'warn', summary: 'ログイン失敗', detail: responseData.error || 'ログインできなかった。', life: 3000 });
      } else {
        // ✅ Edge case: No token in response
        throw new Error('サーバーエラーが発生しました。');
      }
      
    } catch (err) {
      error.value = err.message || '予期しないエラーが発生しました。';

      // Show toast based on API response messages
      if (error.value === 'Email and password are required') {
        toast.add({ severity: 'error', summary: '入力エラー', detail: 'メールとパスワードを入力してください。', life: 3000 });
      } else if (error.value === 'User not found') {
        toast.add({ severity: 'error', summary: 'ログイン失敗', detail: 'ユーザーが見つかりません。', life: 3000 });
        emailError.value = 'ユーザーが見つかりません。';
      } else if (error.value === 'パスワードの誤差がありました。') {
        toast.add({ severity: 'error', summary: 'ログイン失敗', detail: 'パスワードが間違っています。', life: 3000 });
        passwordError.value = 'パスワードが間違っています。';
      } else if (error.value === 'ユーザーが無効になっています。') {
        toast.add({ severity: 'error', summary: 'アカウント無効', detail: 'このユーザーは無効になっています。', life: 3000 });
      } 
    } finally {
      isLoading.value = false;
    }
  };

</script>