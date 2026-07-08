<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  zoneRank: Array
})

const mode = ref('amount')
const containerRef = ref(null)

const sortedData = computed(() => {
  const data = [...props.zoneRank]
  if (mode.value === 'amount') {
    data.sort((a, b) => b.amount - a.amount)
  } else {
    data.sort((a, b) => b.count - a.count)
  }
  return data
})

const maxValue = computed(() => {
  if (mode.value === 'amount') {
    return Math.max(...sortedData.value.map(x => x.amount))
  }
  return Math.max(...sortedData.value.map(x => x.count))
})

const zoneTotal = computed(() => props.zoneRank.reduce((s, x) => s + x.amount, 0))
const top3Share = computed(() => {
  const top3 = props.zoneRank.slice(0, 3).reduce((s, x) => s + x.amount, 0)
  return Math.round(top3 / Math.max(1, zoneTotal.value) * 100)
})

const insights = computed(() => [
  ['TOP1 占比', Math.round(props.zoneRank[0].amount / Math.max(1, zoneTotal.value) * 100) + '%'],
  ['TOP3 占比', top3Share.value + '%'],
  ['活跃专区', props.zoneRank.length + ' 个']
])

function formatValue(item) {
  if (mode.value === 'amount') {
    if (item.amount >= 10000) return '¥' + (item.amount / 10000).toFixed(1) + '万'
    return '¥' + Math.round(item.amount).toLocaleString('zh-CN')
  }
  return item.count + ' 笔'
}

function getBarWidth(item) {
  const value = mode.value === 'amount' ? item.amount : item.count
  return (value / maxValue.value * 100) + '%'
}

function switchMode(newMode) {
  mode.value = newMode
  nextTick(() => {
    const bars = containerRef.value?.querySelectorAll('.fill')
    if (bars) {
      gsap.from(bars, {
        width: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: 'power2.out'
      })
    }
  })
}

onMounted(() => {
  if (!containerRef.value) return
  const bars = containerRef.value.querySelectorAll('.fill')
  gsap.from(bars, {
    width: 0,
    duration: 0.8,
    stagger: 0.08,
    ease: 'power2.out',
    delay: 0.5
  })
})
</script>

<template>
  <article ref="containerRef" class="panel">
    <div class="panel-head">
      <h2>专区排行</h2>
      <div class="seg">
        <button
          :class="{ active: mode === 'amount' }"
          @click="switchMode('amount')"
        >按金额</button>
        <button
          :class="{ active: mode === 'count' }"
          @click="switchMode('count')"
        >按订单</button>
      </div>
    </div>
    <div class="bars">
      <div
        v-for="item in sortedData"
        :key="item.name"
        class="bar-row"
      >
        <div class="bar-name" :title="item.name">{{ item.name }}</div>
        <div class="track">
          <div class="fill" :style="{ width: getBarWidth(item) }"></div>
        </div>
        <div class="bar-value">{{ formatValue(item) }}</div>
      </div>
    </div>
    <div class="insights">
      <div v-for="[label, value] in insights" :key="label" class="insight-item">
        <span class="insight-label">{{ label }}</span>
        <span class="insight-value">{{ value }}</span>
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

.seg {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255,255,255,.7);
  gap: 3px;
}

.seg button {
  border: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  padding: 5px 9px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition);
}

.seg button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--red), var(--gold));
  box-shadow: 0 6px 15px rgba(215,25,32,.18);
}

.bars {
  display: grid;
  gap: 11px;
}

.bar-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) 2.4fr 86px;
  gap: 10px;
  align-items: center;
  font-size: 13px;
}

.bar-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
}

.track {
  height: 11px;
  border-radius: 999px;
  background: #edf1f7;
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--red), var(--gold));
  transition: width 0.5s ease;
}

.bar-value {
  text-align: right;
  font-weight: 700;
  color: #263149;
}

.insights {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.insight-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.insight-label {
  font-size: 12px;
  color: var(--muted);
}

.insight-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}
</style>
