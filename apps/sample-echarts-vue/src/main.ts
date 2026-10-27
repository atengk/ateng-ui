/**
 * sample-echarts-vue 自验展厅入口。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { createApp } from 'vue';
import { install as installECharts } from '@atengk/echarts-vue';
import '@atengk/echarts-vue/style.css';
import App from './App.vue';

const app = createApp(App);

app.use(installECharts);

app.mount('#app');
