/**
 * v-copy 指令单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, defineComponent, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { vCopy } from '../src/directives/copy';

// Mock Element Plus 消息提示
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function mockClipboard(writeTextFn?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeTextFn ? { writeText: writeTextFn } : undefined,
    configurable: true,
    writable: true,
  });
}

describe('v-copy 指令规范与边界测试', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('复制纯文本字符串并给出默认 ElMessage.success 反馈', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeTextMock);

    const TestComponent = defineComponent({
      directives: { copy: vCopy },
      template: `
        <button id="btn" v-copy="'hello ateng'">复制</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    await nextTick();

    expect(writeTextMock).toHaveBeenCalledWith('hello ateng');
    expect(ElMessage.success).toHaveBeenCalledWith('复制成功');
  });

  it('支持 Getter 动态求值函数并复制最新数据', async () => {
    const count = ref(100);
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeTextMock);

    const TestComponent = defineComponent({
      directives: { copy: vCopy },
      setup() {
        return {
          getText: () => `用户总数: ${count.value}`,
        };
      },
      template: `
        <button id="btn" v-copy="getText">复制数量</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    expect(writeTextMock).toHaveBeenCalledWith('用户总数: 100');

    count.value = 200;
    await btn.trigger('click');
    expect(writeTextMock).toHaveBeenCalledWith('用户总数: 200');
  });

  it('支持配置对象并触发自定义文案与 onSuccess 回调', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeTextMock);
    const onSuccess = vi.fn();

    const TestComponent = defineComponent({
      directives: { copy: vCopy },
      setup() {
        return {
          copyConfig: {
            value: 'token_123456',
            message: '已成功存入剪贴板',
            onSuccess,
          },
        };
      },
      template: `
        <button id="btn" v-copy="copyConfig">复制Token</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    await nextTick();

    expect(writeTextMock).toHaveBeenCalledWith('token_123456');
    expect(ElMessage.success).toHaveBeenCalledWith('已成功存入剪贴板');
    expect(onSuccess).toHaveBeenCalledWith('token_123456');
  });

  it('支持静默模式 (message: false) 不弹窗但依然触发 onSuccess', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeTextMock);
    const onSuccess = vi.fn();

    const TestComponent = defineComponent({
      directives: { copy: vCopy },
      setup() {
        return {
          copyConfig: {
            value: 'silent_content',
            message: false,
            onSuccess,
          },
        };
      },
      template: `
        <button id="btn" v-copy="copyConfig">静默复制</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    await nextTick();

    expect(writeTextMock).toHaveBeenCalledWith('silent_content');
    expect(ElMessage.success).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith('silent_content');
  });

  it('未提供 value 时自动兜底提取宿主元素的 textContent', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeTextMock);

    const TestComponent = defineComponent({
      directives: { copy: vCopy },
      template: `
        <span id="text-node" v-copy> 待复制的宿主文字 </span>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const node = wrapper.find('#text-node');

    await node.trigger('click');
    expect(writeTextMock).toHaveBeenCalledWith('待复制的宿主文字');
  });

  it('clipboard API 报错时自动平滑降级至 document.execCommand', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    mockClipboard(writeTextMock);

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const onSuccess = vi.fn();

    const TestComponent = defineComponent({
      directives: { copy: vCopy },
      setup() {
        return {
          copyConfig: {
            value: 'fallback_text',
            onSuccess,
          },
        };
      },
      template: `
        <button id="btn" v-copy="copyConfig">降级复制</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    await nextTick();

    expect(writeTextMock).toHaveBeenCalledWith('fallback_text');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(ElMessage.success).toHaveBeenCalledWith('复制成功');
    expect(onSuccess).toHaveBeenCalledWith('fallback_text');
  });

  it('降级方案亦失败时触发 ElMessage.error 与 onError 回调', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Clipboard blocked'));
    mockClipboard(writeTextMock);

    const execCommandMock = vi.fn().mockReturnValue(false);
    document.execCommand = execCommandMock;

    const onError = vi.fn();

    const TestComponent = defineComponent({
      directives: { copy: vCopy },
      setup() {
        return {
          copyConfig: {
            value: 'fail_text',
            onError,
          },
        };
      },
      template: `
        <button id="btn" v-copy="copyConfig">失败复制</button>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    await nextTick();

    expect(ElMessage.error).toHaveBeenCalledWith('复制失败');
    expect(onError).toHaveBeenCalled();
  });

  it('组件卸载后解绑点击事件，无内存泄漏', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeTextMock);

    const show = ref(true);

    const TestComponent = defineComponent({
      directives: { copy: vCopy },
      setup() {
        return { show };
      },
      template: `
        <div v-if="show">
          <button id="btn" v-copy="'test_text'">复制</button>
        </div>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const btn = wrapper.find('#btn');

    await btn.trigger('click');
    expect(writeTextMock).toHaveBeenCalledTimes(1);

    // 卸载组件
    show.value = false;
    await nextTick();

    expect(wrapper.find('#btn').exists()).toBe(false);
  });
});
