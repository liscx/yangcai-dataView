<script setup>
// 通用堆叠卡片容器：front 在上、back 在下（被堆叠的是后者）
// 交互与动画参考 TopStackCards.vue（采购企业 top10 / 供应商 top10）
import { ref } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  frontLabel: { type: String, default: '前卡' },
  backLabel: { type: String, default: '后卡' }
})

const active = ref('front')
const frontRef = ref(null)
const backRef = ref(null)
let busy = false

const tabs = [
  { key: 'front', label: props.frontLabel },
  { key: 'back', label: props.backLabel }
]

// 通过 slot props 把 Tab 配置交给内部卡片渲染在各自的 panel-head 里
function tabProps() {
  return { tabs, active: active.value, onSwitch: switchTo }
}

function switchTo(target) {
  if (busy || active.value === target) return
  busy = true

  const topEl = active.value === 'front' ? frontRef.value : backRef.value
  const behindEl = active.value === 'front' ? backRef.value : frontRef.value

  const tl = gsap.timeline({
    onComplete: () => {
      active.value = target
      gsap.set([topEl, behindEl], { clearProps: 'all' })
      busy = false
    }
  })

  tl.to(topEl, { x: -80, y: 30, rotation: -2, opacity: 0, duration: 0.3, ease: 'power1.in' })
  tl.set(behindEl, { zIndex: 2 })
  tl.to(behindEl, { x: 0, y: 0, opacity: 1, duration: 0.6, ease: 'power1.out' })
}
</script>

<template>
  <div class="stack-pair">
    <div
      ref="frontRef"
      class="stack-slot"
      :class="active === 'front' ? 'is-front' : 'is-back'"
      @click="active !== 'front' && switchTo('front')"
    >
      <slot name="front" :stack-tabs="tabProps()" />
    </div>
    <div
      ref="backRef"
      class="stack-slot"
      :class="active === 'back' ? 'is-front' : 'is-back'"
      @click="active !== 'back' && switchTo('back')"
    >
      <slot name="back" :stack-tabs="tabProps()" />
    </div>
  </div>
</template>

<style scoped>
/* 两张卡叠在同一格：容器高度 = 两张卡中较高的一张，避免绝对定位导致高度塌陷 */
.stack-pair {
  display: grid;
  grid-template-areas: "stack";
  width: 100%;
  height: 100%;
}

.stack-slot {
  grid-area: stack;
  min-width: 0;
}

.stack-slot > :deep(.panel) {
  height: 100%;
}

.stack-slot.is-front {
  transform: translate(0, 0);
  z-index: 2;
  opacity: 1;
}

.stack-slot.is-front > :deep(.panel) {
  box-shadow: 0 10px 28px rgba(26, 35, 50, 0.12), 0 2px 6px rgba(37, 99, 235, 0.08);
}

.stack-slot.is-back {
  transform: translate(8px, 6px);
  z-index: 1;
  opacity: 0.92;
  cursor: pointer;
}

.stack-slot.is-back > :deep(.panel) {
  pointer-events: none;
  border-color: rgba(37, 99, 235, 0.35);
  box-shadow: 0 4px 16px rgba(26, 35, 50, 0.08);
}

.stack-slot.is-back:hover > :deep(.panel) {
  border-color: #3b82f6;
}
</style>
