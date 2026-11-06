<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
})

const mode = ref('amount')

const sortedData = computed(() => {
  const data = [...props.data]
  if (mode.value === 'amount') {
    data.sort((a, b) => b.amount - a.amount)
  } else {
    data.sort((a, b) => b.count - a.count)
  }
  return data
})

const maxValue = computed(() => {
  if (!sortedData.value.length) return 1
  return Math.max(...sortedData.value.map(x => mode.value === 'amount' ? x.amount : x.count))
})

const total = computed(() => {
  return sortedData.value.reduce((s, x) => s + (mode.value === 'amount' ? x.amount : x.count), 0)
})

function formatValue(item) {
  if (mode.value === 'amount') {
    if (item.amount < 100) return '¥' + item.amount.toFixed(2)
    return '¥' + (Math.floor(item.amount / 10000 * 100) / 100).toFixed(2) + '万'
  }
  return item.count + ' 件'
}

function getBarWidth(item) {
  const value = mode.value === 'amount' ? item.amount : item.count
  return (value / maxValue.value * 100) + '%'
}

function switchMode(m) {
  mode.value = m
}
</script>

<template>
  <article class="panel">
    <div class="panel-head">
      <h2>三级类目 Top10</h2>
      <div class="head-right">
        <span class="note">{{ data.length }} 类</span>
        <div class="seg">
          <button :class="{ active: mode === 'amount' }" @click="switchMode('amount')">按金额</button>
          <button :class="{ active: mode === 'count' }" @click="switchMode('count')">按采购件数</button>
        </div>
      </div>
    </div>

    <div class="scroll-area">
      <div
        v-for="(item, i) in sortedData"
        :key="item.name"
        class="cat-row"
      >
        <div class="cat-rank" :class="{ top: i < 3 }">{{ i + 1 }}</div>
        <div class="cat-name" :title="item.name">{{ item.name }}</div>
        <div class="track">
          <div class="fill" :style="{ width: getBarWidth(item) }"></div>
        </div>
        <div class="cat-value">{{ formatValue(item) }}</div>
        <div class="cat-share">{{ Math.round((mode === 'amount' ? item.amount : item.count) / total * 100) }}%</div>
      </div>
      <div v-if="!sortedData.length" class="empty">暂无类目数据</div>
    </div>
  </article>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  --panel-border: rgba(255, 255, 255, 0.74);
  --panel-backdrop: blur(14px);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  margin-bottom: 12px;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.note {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.panel-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.seg {
  display: inline-flex;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.03);
}

.seg button {
  border: 0;
  background: transparent;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
}

.seg button.active {
  background: linear-gradient(135deg, var(--red), var(--gold));
  color: #fff;
  font-weight: 600;
}

/* 卡片内滚动区域 */
.scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: 9px;
  padding-right: 4px;
  align-content: start;
}

.scroll-area::-webkit-scrollbar {
  width: 5px;
}

.scroll-area::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-area::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 999px;
}

.scroll-area::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

.cat-row {
  display: grid;
  grid-template-columns: 22px minmax(70px, 1fr) 1.6fr 64px 34px;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.cat-rank {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  background: rgba(0, 0, 0, 0.05);
}

.cat-rank.top {
  color: #fff;
  background: linear-gradient(135deg, var(--red), var(--gold));
}

.cat-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink);
  font-size: 12px;
  min-width: 0;
  font-weight: 600;
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

.cat-value {
  text-align: right;
  font-weight: 700;
  font-size: 12px;
  color: #263149;
}

.cat-share {
  text-align: right;
  font-size: 11px;
  color: var(--muted);
}

.empty {
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  padding: 30px 0;
}
</style>
