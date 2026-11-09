<script setup>
import { ref, computed } from 'vue'
import StackTabs from './StackTabs.vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  stackTabs: Object
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
        <StackTabs
          v-if="stackTabs"
          :tabs="stackTabs.tabs"
          :active="stackTabs.active"
          @switch="stackTabs.onSwitch"
        />
      </div>
    </div>

    <!-- 与「商品采购 top10」表格表头等高的列标题 -->
    <div class="cat-head">
      <span>#</span>
      <span>类目名称</span>
      <span>占比</span>
      <span class="num">{{ mode === 'amount' ? '金额' : '采购件数' }}</span>
      <span class="num">份额</span>
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

/* 卡片标题 / 头部间距与「商品采购 top10」保持一致 */
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 8px;
  min-height: 26px;
  margin-bottom: 10px;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.note {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.panel-head h2 {
  margin: 0;
  font-size: 18px;
  white-space: nowrap;
  flex-shrink: 0;
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
/* 表头：th padding 9px 6px、13px 字号、1px 分隔线 —— 与商品采购 thead 等高 */
.cat-head {
  display: grid;
  grid-template-columns: 22px minmax(70px, 1fr) 1.6fr 64px 34px;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: var(--muted);
  font-weight: 600;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.cat-head .num {
  text-align: right;
}

/* 行高与「商品采购 top10」表格对齐：
   表格 td padding 10px 6px + .rank 23px => 行内容 43px，含 1px 分隔线共 44px。
   这里取消行间距、给每行固定 43px + 1px 分隔线，行距逐像素一致。 */
.scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: 0;
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
  min-height: 43px;
  border-bottom: 1px solid #edf1f7;
}

.cat-rank {
  width: 23px;
  height: 23px;
  border-radius: 7px;
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
