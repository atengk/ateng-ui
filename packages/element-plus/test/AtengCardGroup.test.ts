/**
 * AtengCardGroup 多卡片手风琴编排容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { describe, it, expect, afterEach } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AtengCard, AtengCardGroup } from '../src/components/card';

describe('AtengCardGroup 容器组件测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('基础渲染与 activeKeys 受控联动：只有激活 key 的卡片保持展开', () => {
    const TestComponent = defineComponent({
      components: { AtengCardGroup, AtengCard },
      template: `
        <AtengCardGroup :active-keys="['card1']">
          <AtengCard name="card1" title="卡片 1" collapsible>
            <div class="content-1">内容 1</div>
          </AtengCard>
          <AtengCard name="card2" title="卡片 2" collapsible>
            <div class="content-2">内容 2</div>
          </AtengCard>
        </AtengCardGroup>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const cards = wrapper.findAllComponents(AtengCard);

    expect(cards).toHaveLength(2);
    expect(cards[0].classes()).not.toContain('is-collapsed');
    expect(cards[1].classes()).toContain('is-collapsed');
  });

  it('手风琴模式单开互斥 (accordion=true)：展开另一张卡片时自动收起前序卡片', async () => {
    const activeKeys = ref(['card1']);
    const TestComponent = defineComponent({
      components: { AtengCardGroup, AtengCard },
      setup() {
        return { activeKeys };
      },
      template: `
        <AtengCardGroup v-model:active-keys="activeKeys" accordion>
          <AtengCard name="card1" title="卡片 1" collapsible>
            <div class="content-1">内容 1</div>
          </AtengCard>
          <AtengCard name="card2" title="卡片 2" collapsible>
            <div class="content-2">内容 2</div>
          </AtengCard>
        </AtengCardGroup>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const cards = wrapper.findAllComponents(AtengCard);

    expect(cards[0].classes()).not.toContain('is-collapsed');
    expect(cards[1].classes()).toContain('is-collapsed');

    // 点击卡片 2 的折叠/展开按钮
    const foldBtnCard2 = cards[1].find('.at-card__action-btn');
    await foldBtnCard2.trigger('click');

    expect(activeKeys.value).toEqual(['card2']);
    expect(cards[0].classes()).toContain('is-collapsed');
    expect(cards[1].classes()).not.toContain('is-collapsed');
  });

  it('非手风琴多开模式 (accordion=false)：支持同时展开多张卡片', async () => {
    const activeKeys = ref(['card1']);
    const TestComponent = defineComponent({
      components: { AtengCardGroup, AtengCard },
      setup() {
        return { activeKeys };
      },
      template: `
        <AtengCardGroup v-model:active-keys="activeKeys" :accordion="false">
          <AtengCard name="card1" title="卡片 1" collapsible>内容 1</AtengCard>
          <AtengCard name="card2" title="卡片 2" collapsible>内容 2</AtengCard>
        </AtengCardGroup>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const cards = wrapper.findAllComponents(AtengCard);

    // 点击展开卡片 2
    const foldBtnCard2 = cards[1].find('.at-card__action-btn');
    await foldBtnCard2.trigger('click');

    expect(activeKeys.value).toContain('card1');
    expect(activeKeys.value).toContain('card2');
    expect(cards[0].classes()).not.toContain('is-collapsed');
    expect(cards[1].classes()).not.toContain('is-collapsed');
  });

  it('组件实例暴露 expandAll() 与 collapseAll() 对称批量操作', async () => {
    const groupRef = ref<InstanceType<typeof AtengCardGroup> | null>(null);
    const activeKeys = ref<(string | number)[]>([]);

    const TestComponent = defineComponent({
      components: { AtengCardGroup, AtengCard },
      setup() {
        return { groupRef, activeKeys };
      },
      template: `
        <AtengCardGroup ref="groupRef" v-model:active-keys="activeKeys">
          <AtengCard name="card1" title="卡片 1" collapsible>内容 1</AtengCard>
          <AtengCard name="card2" title="卡片 2" collapsible>内容 2</AtengCard>
          <AtengCard name="card3" title="卡片 3" collapsible>内容 3</AtengCard>
        </AtengCardGroup>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const cards = wrapper.findAllComponents(AtengCard);

    // 初始状态全部收起
    expect(cards[0].classes()).toContain('is-collapsed');
    expect(cards[1].classes()).toContain('is-collapsed');
    expect(cards[2].classes()).toContain('is-collapsed');

    // 1. 全部展开
    groupRef.value?.expandAll();
    await wrapper.vm.$nextTick();

    expect(activeKeys.value).toHaveLength(3);
    expect(cards[0].classes()).not.toContain('is-collapsed');
    expect(cards[1].classes()).not.toContain('is-collapsed');
    expect(cards[2].classes()).not.toContain('is-collapsed');

    // 2. 全部收起
    groupRef.value?.collapseAll();
    await wrapper.vm.$nextTick();

    expect(activeKeys.value).toHaveLength(0);
    expect(cards[0].classes()).toContain('is-collapsed');
    expect(cards[1].classes()).toContain('is-collapsed');
    expect(cards[2].classes()).toContain('is-collapsed');
  });

  it('确定性生命周期清理：子 Card 销毁时安全从 Group 中注销', async () => {
    const showCard2 = ref(true);
    const activeKeys = ref(['card1', 'card2']);

    const TestComponent = defineComponent({
      components: { AtengCardGroup, AtengCard },
      setup() {
        return { showCard2, activeKeys };
      },
      template: `
        <AtengCardGroup v-model:active-keys="activeKeys">
          <AtengCard name="card1" title="卡片 1" collapsible>内容 1</AtengCard>
          <AtengCard v-if="showCard2" name="card2" title="卡片 2" collapsible>内容 2</AtengCard>
        </AtengCardGroup>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    expect(wrapper.findAllComponents(AtengCard)).toHaveLength(2);

    // 动态销毁 card2
    showCard2.value = false;
    await wrapper.vm.$nextTick();

    expect(wrapper.findAllComponents(AtengCard)).toHaveLength(1);

    // 销毁后对 Group 执行操作，依然稳健无异常
    const groupComp = wrapper.findComponent(AtengCardGroup);
    groupComp.vm.collapseAll();
    await wrapper.vm.$nextTick();

    expect(activeKeys.value).toEqual([]);
  });

  it('自定义间距样式 (gutter)', () => {
    const TestComponent = defineComponent({
      components: { AtengCardGroup, AtengCard },
      template: `
        <AtengCardGroup gutter="24px">
          <AtengCard name="card1" title="卡片 1">内容 1</AtengCard>
        </AtengCardGroup>
      `,
    });

    wrapper = mount(TestComponent, { attachTo: document.body });
    const groupEl = wrapper.find('.at-card-group');
    expect(groupEl.attributes('style')).toContain('gap: 24px');
  });
});
