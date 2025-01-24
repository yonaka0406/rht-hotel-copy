<template>
    <div class="forgot-password-container flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <Card class="w-full max-w-md">
        <template #title>
          <h2 class="text-2xl font-bold mb-6 text-center">Forgot Password</h2>
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
                <label for="email">Email</label>
              </FloatLabel>
              <small v-if="emailError" class="p-error">{{ emailError }}</small>
            </div>
  
            <div class="mb-4">
              <Button
                label="Reset Password"
                icon="pi pi-refresh"
                class="w-full"
                :loading="isLoading"
                type="submit"
              />
            </div>
  
            <div v-if="successMessage" class="text-center text-green-600">
              {{ successMessage }}
            </div>
            <div v-if="errorMessage" class="text-center text-red-600">
              {{ errorMessage }}
            </div>
          </form>
        </template>
      </Card>
    </div>
  </template>
  
  <script>
    import InputText from 'primevue/inputtext';    
    import FloatLabel from 'primevue/floatlabel';
    import Card from 'primevue/card';
    import Button from 'primevue/button';

    export default {
      components: {
        InputText,        
        FloatLabel,
        Card,
        Button,
      },
      data() {
        return {
          email: '',
          emailError: null,
          successMessage: null,
          errorMessage: null,
          isLoading: false,
        };
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
        async handleResetRequest() {
          this.validateEmail();
          if (this.emailError) return;
    
              this.isLoading = true;
    
          try {
            const response = await this.$http.post('/api/auth/forgot-password', { email: this.email });
            this.successMessage = response.data.message;
          } catch (error) {
            this.errorMessage = 'Error occurred. Please try again.';
          } finally {
            this.isLoading = false;
          }
        },
      },
    };
  </script>
  