<script setup>
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  amountBands: Array
})

const containerRef = ref(null)

const total = props.amountBands.reduce((s, x) => s + x.count, 0)

const bandColors = [
  'var(--green)',
  'var(--teal)',
  'var(--blue)',
  'var(--gold)',
  'var(--red)'
]

function getPercent(count) {
  return Math.round(count / total * 100)
}

onMounted(() => {
  if (!containerRef.value) return
  const items = containerRef.value.querySelectorAll('.band-item')
  gsap.from(items, {
    x: 20,
    opacity: 0,
    duration: 0.5,
    stagger: 0.08,
    ease: 'power2.out',
    delay: 0.7
  })
})
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
  border: 1px solid rgba(255,255,255,.74);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
  padding: 18px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}

h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
  color: var(--ink);
  font-weight: 700;
}

.note {
  color: var(--muted);
  font-size: 12px;
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
