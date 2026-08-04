<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  amountBands: Array
})

const containerRef = ref(null)
let animationContext = null

const total = computed(() => props.amountBands.reduce((sum, item) => sum + item.count, 0))

const bandColors = [
  'var(--green)',
  'var(--teal)',
  'var(--blue)',
  'var(--gold)',
  'var(--red)'
]

function getPercent(count) {
  return Math.round(count / Math.max(1, total.value) * 100)
}

onMounted(() => {
  if (!containerRef.value) return
  animationContext = gsap.context(() => {
    gsap.from('.band-item', {
      x: 20,
      autoAlpha: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: 'power2.out',
      delay: 0.7
    })
  }, containerRef.value)
})

onUnmounted(() => animationContext?.revert())
</script>

<template>
  <article ref="containerRef" class="panel">
    <div class="panel-head">
      <h2>订单金额分层</h2>
      <span class="note">金额区间</span>
    </div>
    <div class="band-list">
      <div
        v-for="(band, index) in amountBands"
        :key="band.name"
        class="band-item"
      >
        <div class="band-label">{{ band.name }}</div>
        <div class="band-bar">
          <div
            class="band-fill"
            :style="{
              width: getPercent(band.count) + '%',
              background: bandColors[index]
            }"
          ></div>
        </div>
        <div class="band-count">{{ band.count }} 笔</div>
        <div class="band-pct">{{ getPercent(band.count) }}%</div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.panel {
  --panel-border: rgba(255, 255, 255, 0.74);
  --panel-backdrop: blur(14px);
}





.band-list {
  display: grid;
  gap: 10px;
}

.band-item {
  display: grid;
  grid-template-columns: 70px 1fr 50px 40px;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.band-label {
  color: var(--ink);
  white-space: nowrap;
}

.band-bar {
  height: 6px;
  border-radius: 3px;
  background: #edf1f7;
  overflow: hidden;
}

.band-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s ease;
}

.band-count {
  text-align: right;
  font-weight: 600;
  color: var(--ink);
}

.band-pct {
  text-align: right;
  color: var(--muted);
}
</style>
