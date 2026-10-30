/**
 * sample-editor-vue 自验展厅入口。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import '@atengk/editor-vue/style.css';
import App from './App.vue';

const app = createApp(App);

app.use(ElementPlus);

app.mount('#app');
