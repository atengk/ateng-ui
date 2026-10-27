/**
 * sample-flow-vue 自验展厅入口。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { createApp } from 'vue';
import { install as installFlow } from '@atengk/flow-vue';
import '@atengk/flow-vue/style.css';
import App from './App.vue';

const app = createApp(App);

app.use(installFlow);

app.mount('#app');
