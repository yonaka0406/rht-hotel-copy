<template>
    <div class="reset-password-container flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <Card class="w-full max-w-md">
        <template #title>
          <h2 class="text-2xl font-bold mb-6 text-center">Reset Password</h2>
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
                  promptLabel="Choose a password"
                  weakLabel="Too simple"
                  mediumLabel="Average complexity"
                  strongLabel="Complex password"
                  class="w-full"
                  :class="{'p-invalid': passwordError}"
                  type="password"
                  required
                  fluid 
                  @blur="validatePassword()"
                >
                    <template #header>
                        <div class="font-semibold text-xm mb-4">Pick a password</div>
                    </template>
                    <template #footer>
                        <Divider />
                        <ul class="pl-2 ml-2 my-0 leading-normal">
                            <li>At least one lowercase</li>
                            <li>At least one uppercase</li>
                            <li>At least one numeric</li>
                            <li>Minimum 8 characters</li>
                        </ul>
                    </template>
                </Password>
                <label for="password">New Password</label>
              </FloatLabel>
              <small v-if="passwordError" class="p-error">{{ passwordError }}</small>
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
                <label for="confirmPassword">Confirm Password</label>
              </FloatLabel>
              <small v-if="confirmPasswordError" class="p-error">{{ confirmPasswordError }}</small>
            </div>
  
            <div class="mb-4">
              <Button
                label="Reset Password"
                icon="pi pi-check"
                class="w-full"
                :loading="isLoading"
                type="submit"
              />
            </div>
  
            <div v-if="errorMessage" class="text-center text-red-600">
              {{ errorMessage }}
            </div>
            <div v-if="successMessage" class="text-center text-green-600">
              {{ successMessage }}
            </div>
          </form>
        </template>
      </Card>
    </div>
  </template>
  
  <script>
    import { ref } from "vue"; 
    import { useToast } from 'primevue/usetoast';
    import { useConfirm } from "primevue/useconfirm";

    import InputText from 'primevue/inputtext';
    import Password from 'primevue/password';
    import FloatLabel from 'primevue/floatlabel';
    import Card from 'primevue/card';
    import Button from 'primevue/button';
    import Divider from 'primevue/divider';

    export default {
        components: {
            InputText,
            Password,
            FloatLabel,
            Card,
            Button,
            Divider,
        },
        data() {
        return {
            password: '',
            confirmPassword: '',
            passwordError: null,
            confirmPasswordError: null,
            isLoading: false,
            successMessage: null,
            errorMessage: null,
        };
        },
        setup (){
            const toast = useToast();
            const confirm = useConfirm();

        },
        methods: {
            validatePassword() {   
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

                if (!this.password) {
                    this.passwordError = "Password is required.";
                } else if (!passwordRegex.test(this.password)) {
                    this.passwordError =
                        "Password must have at least 8 characters, one uppercase letter, one lowercase letter, and one number.";
                } else {
                    this.passwordError = "";
                }

                this.confirmPasswordError = this.confirmPassword !== this.password
                    ? 'Passwords do not match'
                    : null;
            },
            async handleResetPassword() {
                this.validatePassword();
                if (this.passwordError || this.confirmPasswordError) return;
        
                this.isLoading = true;
        
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const token = urlParams.get('token');
                    
                    const response = await this.$http.post('/api/auth/reset-password', { token, password: this.password });
                    this.successMessage = response.data.message;
                } catch (error) {
                this.errorMessage = 'Error resetting password. Please try again.';
                } finally {
                this.isLoading = false;
                }
            },
        },
    };
  </script>
  
  <style scoped>

  </style>
  