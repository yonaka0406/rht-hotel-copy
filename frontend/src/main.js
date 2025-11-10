import { createApp } from 'vue'
import App from './App.vue'
import axios from 'axios';
import router from './router'
import './style.css'
import './assets/css/custom-scrollbar.css'
import PrimeVue  from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Ripple from 'primevue/ripple';
import Tooltip from 'primevue/tooltip';
import 'primeicons/primeicons.css'
import FocusTrap from 'primevue/focustrap';
import { setApiDependencies } from './composables/useApi';

// Set Japanese locale globally
const japaneseLocale = {
    firstDayOfWeek: 0,
    dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
    dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
    dayNamesMin: ['日', '月', '火', '水', '木', '金', '土'],
    monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    today: '今日',
    clear: 'クリア'
};

const app = createApp(App)
app.config.globalProperties.$http = axios;
app.use(PrimeVue, {
    theme: {
        preset: Aura
    },
    ripple: true,
    locale: japaneseLocale
});
app.use(ToastService);
app.use(ConfirmationService);
app.use(router);
app.directive('ripple', Ripple);
app.directive('tooltip', Tooltip);
app.directive('focustrap', FocusTrap);

// Set up global dependencies for API service
// Note: This is a workaround for using Vue composables outside of setup functions
setApiDependencies(router);

app.mount('#app');
