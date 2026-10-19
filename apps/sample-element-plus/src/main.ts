/**
 * @atengk/element-plus 体验展厅主入口。
 *
 * @author Ateng
 * @since 2026-10-19
 */
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';

const app = createApp(App);
app.use(ElementPlus);
app.mount('#app');
