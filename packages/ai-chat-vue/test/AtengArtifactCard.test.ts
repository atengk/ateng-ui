/**
 * @atengk/ai-chat-vue AtengArtifactCard 气泡内紧凑产物卡片单测。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengArtifactCard from '../src/components/AtengArtifactCard.vue';
import type { ArtifactPayload } from '../src/types';

describe('AtengArtifactCard', () => {
  it('应当正确渲染产物标题、语言标识与最新版本号，并响应点击', async () => {
    const artifact: ArtifactPayload = {
      identifier: 'btn-comp',
      title: '高精通用按钮',
      language: 'vue',
      versions: [
        { version: 1, code: '<button>1</button>', timestamp: 1000 },
        { version: 2, code: '<button>2</button>', timestamp: 2000 },
      ],
    };

    const wrapper = mount(AtengArtifactCard, {
      props: { artifact },
    });

    expect(wrapper.text()).toContain('高精通用按钮');
    expect(wrapper.text()).toContain('VUE');
    expect(wrapper.text()).toContain('v2');

    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
    expect(wrapper.emitted('click')![0]).toEqual([artifact]);

    wrapper.unmount();
  });
});
