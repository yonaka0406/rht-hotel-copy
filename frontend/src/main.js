import { createApp } from 'vue'
import App from './App.vue'
import axios from 'axios';
import router from './router'
import './style.css'
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Ripple from 'primevue/ripple';
import Tooltip from 'primevue/tooltip';
import 'primeicons/primeicons.css'

const app = createApp(App)
app.config.globalProperties.$http = axios;
app.use(PrimeVue, {
    theme: {
        preset: Aura
    },
    ripple: true
});
app.use(ToastService);
app.use(ConfirmationService);
app.use(router);
app.directive('ripple', Ripple);
app.directive('tooltip', Tooltip);
app.mount('#app');
