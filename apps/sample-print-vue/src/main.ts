/**
 * sample-print-vue 展厅应用启动入口。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '@atengk/print-vue/style.css';
import { vPrint } from '@atengk/print-vue';

import App from './App.vue';

const app = createApp(App);

app.use(ElementPlus);
app.directive('print', vPrint);

app.mount('#app');
