<script setup>
// 新点收益明细弹窗 —— 方案 B：按供应商行折叠
// 分组与逐期明细（供应商名称 / 类别 / 结算期间 / 结算基数 / 分成 / 用印 / 开票 / 到账 …）
// 全部取自 dashboard-gysdz.json（由 gen_gysdz.py 从《阳光优采供应商结算.xlsx》真实提取）。
import { computed, ref, watch, onUnmounted } from 'vue'
import GYSDZ from '../data/dashboard-gysdz.json'

const props = defineProps({
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

const COLUMNS = [
  { key: 'supplier', label: '供应商名称' },
  { key: 'category', label: '供应商类别' },
  { key: 'start', label: '开始时间' },
  { key: 'end', label: '结束时间' },
  { key: 'base', label: '结算基数', num: true },
  { key: 'ratio', label: '结算比例' },
  { key: 'profit', label: '新点分成', num: true },
  { key: 'sealed', label: '结算单是否用印' },
  { key: 'arrived', label: '是否到账' }
]

// 分组与逐期明细全部取自 dashboard-gysdz.json（由 gen_gysdz.py 从《阳光优采供应商结算.xlsx》提取）
const groups = GYSDZ.profitDetails
const S = GYSDZ.settlement
// 顶部 4 个汇总卡片：与外部「对账结算指标」4 张卡片字段完全一致
const settlementCards = [
  { label: '供应商结算基数总额', value: S.baseTotal },
  { label: '供应商已结算总金额', value: S.settledAmount },
  { label: '新点应收分成', value: S.newProfit },
  { label: '新点已收分成', value: S.newProfitArrived }
]
const PROFIT_TOTAL = S.newProfit
const PERIOD_COUNT = S.periodCount
const expanded = ref(new Set())

// 供应商名称搜索：like 规则（名称包含关键字即命中，大小写不敏感）
const keyword = ref('')

// 是否到账筛选：all=全部 / arrived=仅已到账 / pending=仅暂未到账
// 作用在「结算期」级别：组内有任意匹配状态的结算期才显示该组；展开后仅展示匹配的明细行，汇总数随筛选同步
const arrivedFilter = ref('all')
const round2 = (v) => Math.round(v * 100) / 100
const viewGroups = computed(() => {
  if (arrivedFilter.value === 'all') return groups
  const isArrived = arrivedFilter.value === 'arrived'
  return groups
    .map(g => {
      const details = g.details.filter(d => isArrived ? d.arrived === '已到账' : d.arrived === '暂未到账')
      if (!details.length) return null
      return {
        ...g,
        details,
        count: details.length,
        baseTotal: round2(details.reduce((s, d) => s + d.base, 0)),
        profitTotal: round2(details.reduce((s, d) => s + d.profit, 0)),
        arrivedCount: details.filter(d => d.arrived === '已到账').length
      }
    })
    .filter(Boolean)
})

const filteredGroups = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return viewGroups.value
  return viewGroups.value.filter(g => g.name.toLowerCase().includes(q))
})

const allExpanded = computed(() =>
  filteredGroups.value.length > 0 &&
  filteredGroups.value.every(g => expanded.value.has(g.id))
)

function toggleGroup(id) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

function toggleAll() {
  const next = new Set(expanded.value)
  if (allExpanded.value) filteredGroups.value.forEach(g => next.delete(g.id))
  else filteredGroups.value.forEach(g => next.add(g.id))
  expanded.value = next
}

function money(v) {
  return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function cellText(row, col) {
  const v = row[col.key]
  if (col.num) return money(v)
  return v === '' || v === null || v === undefined ? '' : v
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
watch(() => props.open, v => {
  if (v) document.addEventListener('keydown', onKey)
  else document.removeEventListener('keydown', onKey)
})
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="新点收益明细">
        <div class="modal-head">
          <div>
            <h2>新点收益明细</h2>
            <span class="modal-sub">按供应商分组折叠 · 数值取自《阳光优采供应商结算.xlsx》真实数据</span>
          </div>
          <button class="close-btn" aria-label="关闭" @click="emit('close')">×</button>
        </div>

        <div class="modal-metrics">
          <div class="mini-metric" v-for="(c, i) in settlementCards" :key="i">
            <span>{{ c.label }}</span>
            <b>{{ money(c.value) }}</b>
          </div>
        </div>

        <div class="table-toolbar">
          <span class="toolbar-hint">点击供应商行展开该组结算期明细，汇总数据从「开始时间」列起展示</span>
          <button class="tool-btn" @click="toggleAll">{{ allExpanded ? '全部收起' : '全部展开' }}</button>
          <select class="filter-select" v-model="arrivedFilter" aria-label="是否到账筛选">
            <option value="all">到账状态：全部</option>
            <option value="arrived">已到账</option>
            <option value="pending">暂未到账</option>
          </select>
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input v-model="keyword" type="text" placeholder="搜索供应商名称" />
          </div>
          <span class="hit-count">{{ filteredGroups.length }} 家</span>
        </div>

        <div class="modal-table-wrap">
          <table>
            <colgroup>
              <col style="width: 21%">
              <col style="width: 9%">
              <col style="width: 10%">
              <col style="width: 10%">
              <col style="width: 11%">
              <col style="width: 9%">
              <col style="width: 11%">
              <col style="width: 10%">
              <col style="width: 9%">
            </colgroup>
            <thead>
              <tr>
                <th v-for="c in COLUMNS" :key="c.key">{{ c.label }}</th>
              </tr>
            </thead>
            <tbody v-for="g in filteredGroups" :key="g.id">
              <tr class="group-row" @click="toggleGroup(g.id)">
                <td class="group-name-cell" :title="g.name">
                  <span class="arrow">{{ expanded.has(g.id) ? '▾' : '▸' }}</span>
                  <b>{{ g.name }}</b>
                </td>
                <td>
                  <span class="type-tag" :class="g.category === '电商' ? 'type-ecom' : 'type-local'">{{ g.category }}</span>
                </td>
                <td class="group-stat">{{ g.count }} 期</td>
                <td class="group-stat">已到账 {{ g.arrivedCount }} 期</td>
                <td class="num group-stat">{{ money(g.baseTotal) }}</td>
                <td class="group-stat">{{ g.ratioText }}</td>
                <td class="num group-stat strong">{{ money(g.profitTotal) }}</td>
                <td class="group-stat">—</td>
                <td class="group-stat">—</td>
              </tr>
              <template v-if="expanded.has(g.id)">
                <tr v-for="(d, i) in g.details" :key="i" class="detail-row">
                  <td
                    v-for="c in COLUMNS"
                    :key="c.key"
                    :class="[
                      { num: c.num },
                      c.key === 'arrived' ? (d.arrived === '已到账' ? 'arrived-ok' : 'arrived-pending') : ''
                    ]"
                    :title="cellText(d, c)"
                  >{{ cellText(d, c) }}</td>
                </tr>
              </template>
            </tbody>
            <tbody v-if="!filteredGroups.length">
              <tr>
                <td :colspan="COLUMNS.length" class="empty-row">未找到匹配的供应商</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-foot">
          <span>点击遮罩或按 Esc 关闭</span>
          <button class="ok-btn" @click="emit('close')">知道了</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
}

.modal-card {
  width: 1220px;
  max-width: calc(100vw - 40px);
  /* 尺寸固定：搜索后结果变少也不收缩，表格区留白 */
  height: 86vh;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
  padding: 20px 22px 16px;
  color: var(--ink);
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.modal-head h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.modal-sub {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.close-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #f8fafc;
  color: var(--muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover {
  background: #eef2f7;
  color: var(--ink);
}

.modal-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.mini-metric {
  background: #f6f8fb;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-metric span {
  font-size: 12px;
  color: var(--muted);
}

.mini-metric b {
  font-size: 19px;
  font-weight: 700;
}

.table-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--muted);
}

.toolbar-hint {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-btn {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #f8fafc;
  color: var(--ink);
  font-size: 12px;
  padding: 5px 12px;
  cursor: pointer;
  white-space: nowrap;
}

.tool-btn:hover {
  border-color: var(--blue);
  color: var(--blue);
}

.filter-select {
  height: 27px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #f8fafc;
  color: var(--ink);
  font-size: 12px;
  cursor: pointer;
  outline: none;
  box-sizing: border-box;
}

.filter-select:hover {
  border-color: var(--blue);
}

.filter-select:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.tool-btn, .filter-select, .search-box, .hit-count {
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
  width: 176px;
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

.hit-count {
  white-space: nowrap;
}

.empty-row {
  text-align: center;
  color: var(--muted);
  padding: 24px 0;
}

.modal-table-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 12px;
}

th {
  text-align: left;
  color: var(--muted);
  font-weight: 600;
  padding: 9px 8px;
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  background: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 2;
}

th.num, td.num {
  text-align: right;
}

td {
  padding: 8px;
  border-bottom: 1px solid #edf1f7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-row td {
  background: #f3f7fc;
  cursor: pointer;
  padding: 9px 8px;
}

.group-row:hover td {
  background: #e8f1fd;
}

.group-name-cell b {
  font-size: 13px;
  font-weight: 700;
}

.group-stat {
  color: var(--muted);
}

.group-stat.strong {
  color: var(--ink);
  font-weight: 700;
}

.arrow {
  color: var(--blue);
  font-size: 13px;
  display: inline-block;
  width: 14px;
}

.type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.type-ecom {
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
}

.type-local {
  background: rgba(13, 148, 136, 0.12);
  color: #0d9488;
}

.detail-row td {
  color: #334155;
}

/* 是否到账：不同状态用不同颜色 */
.detail-row td.arrived-ok {
  color: var(--green);
  font-weight: 600;
}

.detail-row td.arrived-pending {
  color: var(--gold);
  font-weight: 600;
}

.modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 12px;
  color: var(--muted);
}

.ok-btn {
  border: 0;
  border-radius: 7px;
  padding: 8px 18px;
  background: var(--blue);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.ok-btn:hover {
  opacity: 0.9;
}
</style>
