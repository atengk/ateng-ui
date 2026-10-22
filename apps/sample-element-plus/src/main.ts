/**
 * @atengk/element-plus 体验展厅主入口。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';

import AtengElementPlus from '@atengk/element-plus';
import '@atengk/element-plus/style.css';
import '@atengk/element-plus/theme-pro.css';

import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(ElementPlus);
app.use(AtengElementPlus);
app.use(router);

app.mount('#app');
