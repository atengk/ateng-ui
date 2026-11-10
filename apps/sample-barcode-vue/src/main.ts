/**
 * sample-barcode-vue 展厅应用启动入口。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '@atengk/barcode-vue/style.css';

import App from './App.vue';

const app = createApp(App);

app.use(ElementPlus);

app.mount('#app');
