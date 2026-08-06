<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({ active: { type: Number, default: 0 } })
const emit = defineEmits(['update:active'])

const wrapRef = ref(null)
const cards = ref([])
const onTop = ref(0)
let busy = false

function setRef(i, el) { cards.value[i] = el }

function syncHeight() {
  // 用当前顶部卡片的内容高度撑开容器
  const top = cards.value[onTop.value]
  if (!top || !wrapRef.value) return
  wrapRef.value.style.height = top.scrollHeight + 'px'
}

function place() {
  const top = cards.value[onTop.value]
  const bot = cards.value[1 - onTop.value]
  if (!top || !bot) return

  gsap.set(top, { x: 0, y: 0, zIndex: 2, autoAlpha: 1 })
  gsap.set(bot, { x: 20, y: 20, zIndex: 1, autoAlpha: 1 })

  nextTick(syncHeight)
}

function flip() {
  if (busy) return
  busy = true

  const top = cards.value[onTop.value]
  const bot = cards.value[1 - onTop.value]

  const tl = gsap.timeline({
    onComplete() {
      onTop.value = 1 - onTop.value
      place()
      busy = false
      emit('update:active', onTop.value)
    }
  })

  tl.to(top, {
    x: 20, y: 20, zIndex: 1,
    duration: 0.45,
    ease: 'power2.inOut'
  }, 0)

  tl.to(bot, {
    x: 0, y: 0, zIndex: 3,
    duration: 0.45,
    ease: 'power2.inOut'
  }, 0)
}

function onClick(i) {
  if (i !== onTop.value) flip()
}

watch(() => props.active, v => nextTick(() => onClick(v)))
onMounted(() => {
  place()
  window.addEventListener('resize', syncHeight)
})
</script>

<template>
  <div class="stack-outer">
    <!-- 装饰层：堆叠阴影效果 -->
    <div class="stack-shadow"></div>
    <!-- 主面板 -->
    <div ref="wrapRef" class="stack-panel">
      <div :ref="el => setRef(0, el)" class="stack-card" @click="onClick(0)">
        <slot name="front" />
      </div>
      <div :ref="el => setRef(1, el)" class="stack-card" @click="onClick(1)">
        <slot name="back" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stack-outer {
  position: relative;
}

/* 堆叠阴影：在主面板右下偏移 */
.stack-shadow {
  position: absolute;
  inset: 0;
  border-radius: var(--radius);
  background: var(--panel);
  border: 1px solid var(--line);
  transform: translate(20px, 20px);
  box-shadow: 0 8px 32px rgba(26, 35, 50, 0.16);
  pointer-events: none;
}

/* 主面板：提供组件边界 */
.stack-panel {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: 0 4px 24px rgba(26, 35, 50, 0.08);
}

/* 卡片：只是内容，无背景无边框 */
.stack-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
  box-sizing: border-box;
}
</style>
