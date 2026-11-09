/**
 * @atengk/ai-chat-vue AtengArtifactSidebar 独立产物工作台侧边栏单测。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengArtifactSidebar from '../src/components/AtengArtifactSidebar.vue';
import type { ArtifactPayload } from '../src/types';

describe('AtengArtifactSidebar', () => {
  const sampleArtifact: ArtifactPayload = {
    identifier: 'card-comp',
    title: '用户资料卡片',
    language: 'vue',
    versions: [
      { version: 1, code: '<template><div>v1 Card</div></template>', timestamp: 1000 },
      {
        version: 2,
        code: '<template><div class="v2">v2 Card With Style</div></template>',
        timestamp: 2000,
      },
    ],
  };

  it('应当正确渲染顶栏信息、版本号与默认 Code 视图源码', () => {
    const wrapper = mount(AtengArtifactSidebar, {
      props: {
        artifact: sampleArtifact,
        visible: true,
        activeVersion: 2,
      },
    });

    expect(wrapper.text()).toContain('用户资料卡片');
    expect(wrapper.text()).toContain('VUE');
    expect(wrapper.text()).toContain('v2 Card With Style');

    wrapper.unmount();
  });

  it('应当支持版本切换与双向绑定更新', async () => {
    const wrapper = mount(AtengArtifactSidebar, {
      props: {
        artifact: sampleArtifact,
        visible: true,
        activeVersion: 2,
      },
    });

    const select = wrapper.find('.at-artifact-sidebar__version-select');
    expect(select.exists()).toBe(true);

    // 切换到版本 1
    await select.setValue('1');

    expect(wrapper.emitted('versionChange')).toBeTruthy();
    expect(wrapper.emitted('versionChange')![0]).toEqual([1]);
    expect(wrapper.emitted('update:activeVersion')).toBeTruthy();
    expect(wrapper.emitted('update:activeVersion')![0]).toEqual([1]);

    wrapper.unmount();
  });

  it('应当支持三模切换并高保真支持 #diff 插槽反转', async () => {
    const wrapper = mount(AtengArtifactSidebar, {
      props: {
        artifact: sampleArtifact,
        visible: true,
        activeVersion: 2,
      },
      slots: {
        diff: `
          <template #diff="{ originalCode, modifiedCode, language }">
            <div class="custom-diff-slot">
              <span class="diff-lang">{{ language }}</span>
              <pre class="orig">{{ originalCode }}</pre>
              <pre class="mod">{{ modifiedCode }}</pre>
            </div>
          </template>
        `,
      },
    });

    // 点击 Diff 按钮切换至比对视图
    const diffBtn = wrapper.find('[data-mode="diff"]');
    expect(diffBtn.exists()).toBe(true);
    await diffBtn.trigger('click');

    expect(wrapper.emitted('modeChange')).toBeTruthy();
    expect(wrapper.emitted('modeChange')![0]).toEqual(['diff']);

    // 检查插槽反转是否成功透传了前后版本代码
    const diffSlot = wrapper.find('.custom-diff-slot');
    expect(diffSlot.exists()).toBe(true);
    expect(diffSlot.find('.diff-lang').text()).toBe('vue');
    expect(diffSlot.find('.orig').text()).toContain('v1 Card');
    expect(diffSlot.find('.mod').text()).toContain('v2 Card With Style');

    wrapper.unmount();
  });

  it('点击关闭按钮应当发出 close 与 update:visible 事件', async () => {
    const wrapper = mount(AtengArtifactSidebar, {
      props: {
        artifact: sampleArtifact,
        visible: true,
      },
    });

    const closeBtn = wrapper.find('.at-artifact-sidebar__close-btn');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
    expect(wrapper.emitted('update:visible')).toBeTruthy();
    expect(wrapper.emitted('update:visible')![0]).toEqual([false]);

    wrapper.unmount();
  });
});
