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
  return data.slice(0, 10)
})

const maxValue = computed(() => {
  if (mode.value === 'amount') {
    return Math.max(...sortedData.value.map(x => x.amount))
  }
  return Math.max(...sortedData.value.map(x => x.count))
})

const zoneTotal = computed(() => props.zoneRank.reduce((s, x) => s + x.amount, 0))
const orderTotal = computed(() => props.zoneRank.reduce((s, x) => s + x.count, 0))
const top3Share = computed(() => {
  if (mode.value === 'amount') {
    const top3 = sortedData.value.slice(0, 3).reduce((s, x) => s + x.amount, 0)
    return Math.round(top3 / Math.max(1, zoneTotal.value) * 100)
  } else {
    const top3 = sortedData.value.slice(0, 3).reduce((s, x) => s + x.count, 0)
    return Math.round(top3 / Math.max(1, orderTotal.value) * 100)
  }
})
const top3 = computed(() => sortedData.value.slice(0, 3))
const avgPerOrder = computed(() => Math.round(zoneTotal.value / Math.max(1, orderTotal.value)))

const insights = computed(() => {
  const top1Value = mode.value === 'amount'
    ? sortedData.value[0].amount
    : sortedData.value[0].count
  const total = mode.value === 'amount' ? zoneTotal.value : orderTotal.value
  const top1Share = Math.round(top1Value / Math.max(1, total) * 100)

  return [
    ['TOP1 占比', top1Share + '%'],
    ['TOP3 占比', top3Share.value + '%'],
    ['活跃专区', props.zoneRank.length + ' 个']
  ]
})

const medals = ['🥇', '🥈', '🥉']
const medalColors = [
  { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', text: '#92400e' },
  { bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', border: '#94a3b8', text: '#475569' },
  { bg: 'linear-gradient(135deg, #fed7aa, #fdba74)', border: '#f97316', text: '#9a3412' }
]

function formatValue(item) {
  if (mode.value === 'amount') {
    return '¥' + (Math.floor(item.amount / 10000 * 100) / 100).toFixed(2) + '万'
  }
  return item.count + ' 笔'
}

function formatCompact(n) {
  return (Math.floor(n / 10000 * 100) / 100).toFixed(2) + '万'
}

function getBarWidth(item) {
  const value = mode.value === 'amount' ? item.amount : item.count
  return (value / maxValue.value * 100) + '%'
}

function getShare(item) {
  const total = mode.value === 'amount' ? zoneTotal.value : orderTotal.value
  return Math.round((mode.value === 'amount' ? item.amount : item.count) / Math.max(1, total) * 100)
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
  gsap.from(containerRef.value.querySelectorAll('.podium-card'), {
    y: 12,
    opacity: 0,
    duration: 0.5,
    stagger: 0.1,
    ease: 'power2.out',
    delay: 0.3
  })
  gsap.from(containerRef.value.querySelectorAll('.fill'), {
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
      <h2>专区top10</h2>
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

    <!-- Top3 领奖台 -->
    <div class="podium">
      <div
        v-for="(item, i) in top3"
        :key="item.name"
        class="podium-card"
        :style="{ background: medalColors[i].bg, borderColor: medalColors[i].border }"
      >
        <div class="podium-rank" :style="{ color: medalColors[i].text }">{{ medals[i] }}</div>
        <div class="podium-info">
          <div class="podium-name" :title="item.name">{{ item.name }}</div>
          <div class="podium-stats">
            <template v-if="mode === 'amount'">
              <span class="podium-amount">¥{{ formatCompact(item.amount) }}</span>
              <span class="podium-count">{{ item.count }} 单</span>
            </template>
            <template v-else>
              <span class="podium-amount">{{ item.count }} 单</span>
              <span class="podium-count">¥{{ formatCompact(item.amount) }}</span>
            </template>
          </div>
          <div class="podium-bar-wrap">
            <div
              class="podium-bar"
              :style="{
                width: mode === 'amount'
                  ? (item.amount / Math.max(1, zoneTotal) * 100) + '%'
                  : (item.count / Math.max(1, orderTotal) * 100) + '%',
                background: medalColors[i].border
              }"
            ></div>
          </div>
          <div class="podium-share">{{ mode === 'amount'
            ? Math.round(item.amount / Math.max(1, zoneTotal) * 100)
            : Math.round(item.count / Math.max(1, orderTotal) * 100) }}%</div>
        </div>
      </div>
    </div>

    <!-- 完整排行条 -->
    <div class="bars">
      <div
        v-for="item in sortedData.slice(3)"
        :key="item.name"
        class="bar-row"
      >
        <div class="bar-name" :title="item.name">{{ item.name }}</div>
        <div class="track">
          <div class="fill" :style="{ width: getBarWidth(item) }"></div>
        </div>
        <div class="bar-value">{{ formatValue(item) }}</div>
        <div class="bar-share">{{ getShare(item) }}%</div>
      </div>
    </div>

    <!-- 底部洞察 -->
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

/* Top3 领奖台 */
.podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.podium-card {
  border: 1px solid;
  border-radius: 10px;
  padding: 12px 10px 10px;
  text-align: center;
  position: relative;
}

.podium-rank {
  font-size: 22px;
  line-height: 1;
  margin-bottom: 6px;
}

.podium-info {
  min-width: 0;
}

.podium-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6px;
}

.podium-stats {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 6px;
}

.podium-amount {
  font-weight: 700;
  color: #263149;
  font-size: 13px;
}

.podium-count {
  font-size: 11px;
  color: var(--muted);
}

.podium-bar-wrap {
  height: 4px;
  border-radius: 99px;
  background: rgba(0,0,0,.06);
  overflow: hidden;
  margin-bottom: 4px;
}

.podium-bar {
  height: 100%;
  border-radius: 99px;
  transition: width 0.6s ease;
}

.podium-share {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

/* 排行条 */
.bars {
  display: grid;
  gap: 9px;
}

.bar-row {
  display: grid;
  grid-template-columns: minmax(80px, 1fr) 1.8fr 72px 36px;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.bar-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink);
  font-size: 12px;
  min-width: 0;
}

.track {
  height: 10px;
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
  font-size: 12px;
  color: #263149;
}

.bar-share {
  text-align: right;
  font-size: 11px;
  color: var(--muted);
}

.insights {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.insight-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.insight-label {
  font-size: 11px;
  color: var(--muted);
}

.insight-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}
</style>
