<script setup>
// 各专区供应商规模
// 本地供应商各专区分布：取自《供应商列表》按「所属专区」真实计数
// 电商入驻数：取自《专区电商入驻表》按「已入驻/需铺品（已入驻）」计数
// 以上均由 gen_gysdz.py 提取进 dashboard-gysdz.json（zoneScale 字段）
import { computed, ref } from 'vue'
import GYSDZ from '../data/dashboard-gysdz.json'

// 数据接入 dashboard-gysdz.json（zoneScale：各专区本地/电商分布，由 gen_gysdz.py 提取）
const rows = computed(() => GYSDZ.zoneScale.map(z => {
  const localTotal = z.localTotal
  // 源数据无本地订单级明细，「有订单本地」暂以本地供应商总数近似
  const localOrdered = z.localTotal
  const ecomTotal = z.ecomTotal
  const ecomOrdered = z.ecomOrdered
  const total = localTotal + ecomTotal
  const ordered = localOrdered + ecomOrdered
  const rate = total ? Math.round(ordered / total * 100) : 0
  return { name: z.name, localTotal, localOrdered, ecomTotal, ecomOrdered, total, ordered, rate, payRate: z.payRate }
}))

// 条形宽度按当前最大总家数自适应（避免总数超过固定刻度时被截断）
const maxTotal = computed(() => Math.max(90, ...rows.value.map(r => r.total)))

// 专区名称搜索：like 规则（名称包含关键字即命中，大小写不敏感）
const keyword = ref('')
// 数据截至：取自源数据快照日期（供应商列表文件名中的 2026-11-10）
const zoneDataAsOf = GYSDZ.meta.zoneDataAsOf
const filteredRows = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(r => r.name.toLowerCase().includes(q))
})

function outerWidth(total) {
  return Math.max(6, Math.round(total / maxTotal.value * 100)) + '%'
}

// 采购人支付率配色：>=80% 绿 / 60-80% 金 / <60% 红
function payColor(pct) {
  if (pct >= 80) return 'var(--green)'
  if (pct >= 60) return 'var(--gold)'
  return 'var(--red)'
}

function innerWidth(ordered, total) {
  return Math.round(ordered / total * 100) + '%'
}

</script>

<template>
  <article class="panel zone-scale">
    <div class="scale-inner">
      <div class="panel-head">
        <h2>各专区供应商规模</h2>
        <div class="head-right">
          <span class="asof-note" v-if="zoneDataAsOf">数据截至 {{ zoneDataAsOf }}</span>
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input v-model="keyword" type="text" placeholder="搜索专区名称" />
          </div>
          <span class="note">{{ filteredRows.length }} 个专区</span>
        </div>
      </div>

      <div class="legend">
        <span class="legend-title">图例</span>
        <span class="legend-item"><i class="swatch outer"></i>该类供应商总数</span>
        <span class="legend-item"><i class="swatch local"></i>有订单（本地）</span>
        <span class="legend-item"><i class="swatch ecom"></i>有订单（电商）</span>
      </div>

      <div class="metric-notes">
        <span>总家数 = 本地供应商 + 电商供应商</span>
        <span>转化率 = 有订单供应商数 / 总家数</span>
        <span>支付率 = 采购人已支付比例（来自专区支付率表，未列入者按 100% 计）</span>
      </div>

      <div class="zone-list">
        <div v-for="row in filteredRows" :key="row.name" class="zone-row">
          <div class="zone-line">
            <span class="zone-name" :title="row.name">{{ row.name }}</span>
          <span
            class="metric"
            :title="`本地 ${row.localTotal} 家 + 电商 ${row.ecomTotal} 家 = ${row.total} 家`"
          >总家数 <b>{{ row.total }} 家</b></span>
            <span
              class="metric"
              :title="`有订单：本地 ${row.localOrdered} + 电商 ${row.ecomOrdered} = ${row.ordered} 家`"
            >有订单 <b>{{ row.ordered }} 家</b></span>
            <span
              class="metric pay"
              :style="{ color: payColor(row.payRate) }"
              :title="`采购人支付率 ${row.payRate}%（未列入支付率表的专区按 100% 计）`"
            >支付率 <b>{{ row.payRate }}%</b></span>
          <span
            class="metric"
            :title="`有订单供应商 ${row.ordered} 家 / 总家数 ${row.total} 家 = ${row.rate}%`"
          >转化率 <b>{{ row.rate }}%</b></span>
          </div>

          <div class="bar-line">
            <span class="bar-tag">本地</span>
            <div class="bar-track">
              <div class="bar-outer" :style="{ width: outerWidth(row.localTotal) }">
                <div class="bar-inner local" :style="{ width: innerWidth(row.localOrdered, row.localTotal) }"></div>
              </div>
            </div>
            <span class="bar-val">{{ row.localOrdered }}/{{ row.localTotal }}</span>
          </div>

          <div class="bar-line">
            <span class="bar-tag">电商</span>
            <div class="bar-track">
              <div class="bar-outer" :style="{ width: outerWidth(row.ecomTotal) }">
                <div class="bar-inner ecom" :style="{ width: innerWidth(row.ecomOrdered, row.ecomTotal) }"></div>
              </div>
            </div>
            <span class="bar-val">{{ row.ecomOrdered }}/{{ row.ecomTotal }}</span>
          </div>
        </div>
        <div v-if="!filteredRows.length" class="empty">未找到匹配的专区</div>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* 卡片本身不贡献内容高度：绝对定位内层撑满网格给的高度，
   由同行「近7天订单趋势」决定卡片高度，23 个专区只在内部列表滚动 */
.zone-scale.panel {
  position: relative;
  display: block;
  padding: 0;
  min-height: 0;
  overflow: hidden;
  --panel-border: rgba(255, 255, 255, 0.74);
  --panel-backdrop: blur(14px);
}

.scale-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 18px;
  box-sizing: border-box;
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.panel-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
}

.note {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
}

.asof-note {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box svg {
  position: absolute;
  left: 8px;
  width: 13px;
  height: 13px;
  color: var(--muted);
  pointer-events: none;
}

.search-box input {
  width: 148px;
  height: 27px;
  padding: 0 8px 0 26px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-box input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.search-box input::placeholder {
  color: #9aa4b2;
}

.empty {
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  padding: 24px 0;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.legend-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

.swatch {
  display: inline-block;
  width: 14px;
  height: 8px;
  border-radius: 2px;
}

.swatch.outer {
  background: #e8edf4;
  border: 1px solid var(--line);
}

.swatch.local {
  background: var(--teal);
}

.swatch.ecom {
  background: var(--blue);
}

.metric-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.metric-notes span {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

.zone-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.zone-list::-webkit-scrollbar {
  width: 5px;
}

.zone-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 999px;
}

.zone-row {
  padding: 7px 0 8px;
  border-bottom: 1px solid #edf1f7;
}

.zone-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 5px;
  font-size: 12px;
}

.zone-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric {
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.metric b {
  color: var(--ink);
  font-weight: 700;
}

.metric.pay b {
  color: inherit;
}

.bar-line {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 52px;
  gap: 6px;
  align-items: center;
  height: 16px;
  font-size: 11px;
}

.bar-tag {
  color: var(--muted);
}

.bar-track {
  width: 100%;
  height: 13px;
}

.bar-outer {
  height: 13px;
  border-radius: 3px;
  background: #e8edf4;
  border: 1px solid var(--line);
  overflow: hidden;
  box-sizing: border-box;
}

.bar-inner {
  height: 100%;
  border-radius: 2px;
}

.bar-inner.local {
  background: var(--teal);
}

.bar-inner.ecom {
  background: var(--blue);
}

.bar-val {
  text-align: right;
  color: var(--muted);
  white-space: nowrap;
}
</style>
