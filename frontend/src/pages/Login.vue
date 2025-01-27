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
                class="w-full"
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
                fuild
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

<script>
  import { useToast } from 'primevue/usetoast';
  import InputText from 'primevue/inputtext';
  import Password from 'primevue/password';
  import FloatLabel from 'primevue/floatlabel';
  import Card from 'primevue/card';
  import Button from 'primevue/button';
  import Fluid from 'primevue/fluid';

  export default {
    components: {
      InputText,
      Password,
      FloatLabel,
      Card,
      Button,
      Fluid,
    },
    data() {
      return {
        email: '',
        password: '',
        error: null,
        isLoading: false,
        emailError: null,
        passwordError: null,
      };
    },
    setup () {
      const toast = useToast();
      return { toast };
    },
    methods: {
      validateEmail() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        this.emailError = !this.email 
          ? 'Email is required' 
          : !emailRegex.test(this.email) 
          ? 'Invalid email format' 
          : null;
      },
      validatePassword() {
        this.passwordError = !this.password 
          ? 'Password is required' 
          : null;
      },
      async handleLogin() {
        try {
          // Validate email and password fields
          this.validateEmail();
          this.validatePassword();

          // Stop if there are validation errors
          if (this.emailError || this.passwordError) {
            return;
          }

          // Reset errors and start loading
          this.error = null;
          this.isLoading = true;
          
          // Make the login request
          const response = await this.$http.post('/api/auth/login', {
            email: this.email,
            password: this.password,
          });
          
          // Extract and store the authentication token
          const authToken = response.data.token;
          localStorage.setItem('authToken', authToken);

          // Redirect the user to the home page
          this.$router.push('/');        
        } catch (err) {          
          // Handle different kinds of errors
          if (!err.response) {
            // Network or server error
            this.error = 'Network error. Please check your connection.';
          } else if (err.response.status === 401) {
            // Authentication errors
            this.error = err.response.data?.error || '認証が無効です。';
            this.toast.add({
              severity: 'error',
              summary: 'ログイン失敗',
              detail: err.response ? err.response.data?.error : 'エラーが起きました。',
              life: 3000
            });
          } else {
            // General error message
            this.error = 'An unexpected error occurred. Please try again.';
          }
          
          // Handle different kinds of errors
          if (!err.response) {
            // Network or server error
            this.error = 'Network error. Please check your connection.';
          } else if (err.response.status === 401) {
            // Authentication errors
            this.error = err.response.data?.error || 'Invalid credentials.';
          } else {
            // General error message
            this.error = 'An unexpected error occurred. Please try again.';
          }
          
          // Set specific field errors based on backend response
          if (this.error.includes('ユーザー見つかりません。')) {
            this.emailError = this.error;
          } else if (this.error.includes('パスワードの誤差があります。')) {
            this.passwordError = this.error;
          }
        } finally {
          this.isLoading = false;
        }
      },
    },
  };
</script>