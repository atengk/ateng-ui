/**
 * @atengk/vue 响应式通用 Hooks 自验工程主入口。
 *
 * @author Ateng
 * @since 2026-10-19
 */
import { createApp } from 'vue';
import { createAtengVue } from '@atengk/vue';
import App from './App.vue';

const app = createApp(App);

// 注册 @atengk/vue 全局插件，配置默认分页条数为 20
app.use(
  createAtengVue({
    defaultPageSize: 20,
    onError: err => {
      // 全局捕获错误
      console.warn('[sample-vue 全局捕获]', err);
    },
  }),
);

app.mount('#app');
