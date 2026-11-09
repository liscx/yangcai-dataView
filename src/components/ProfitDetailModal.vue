<script setup>
// 新点收益明细弹窗 —— 方案 B：按供应商行折叠
// 分组标签（供应商名称 / 类别）取自「阳光优采对账结算_结算期间标准化.xlsx」，原样保留；
// 其余数值均为假数据，按该表 14 列结构生成，仅用于演示交互。
import { computed, ref, watch, onUnmounted } from 'vue'

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

const SUPPLIERS = [
  ['得力集团有限公司', '电商'],
  ['绍兴市得力集实科技有限公司', '电商'],
  ['欧菲斯集团股份有限公司', '电商'],
  ['苏宁易购集团股份有限公司', '电商'],
  ['深圳齐心集团股份有限公司', '电商'],
  ['紫迈电子商务有限公司', '电商'],
  ['深圳市怡亚通供应链股份有限公司', '电商'],
  ['震坤行工业超市（上海）有限公司', '电商'],
  ['史泰博(上海)有限公司', '电商'],
  ['咸亨国际科技股份有限公司', '电商'],
  ['浙江宏伟供应链集团股份有限公司', '电商'],
  ['阳采集团有限公司', '电商'],
  ['鑫方盛数智科技股份有限公司', '电商'],
  ['江苏比高机电设备有限公司', '电商'],
  ['北京鸿昌一创文具礼品有限责任公司', '本地供应商'],
  ['南京誉天电子科技有限公司', '本地供应商'],
  ['徐州江琦商贸有限公司', '本地供应商'],
  ['南京优亚逸信息技术有限公司', '本地供应商'],
  ['快购达集团有限公司', '本地供应商'],
  ['福州恒胜达数码科技有限公司', '本地供应商'],
  ['徐州德普机电科技有限公司', '本地供应商'],
  ['徐州鑫驰办公设备有限公司', '本地供应商'],
  ['昌吉市联金商贸有限公司', '本地供应商'],
  ['大江科技集团有限公司', '本地供应商'],
  ['福州安妮全办公用品有限公司', '本地供应商'],
  ['福州众利电子有限公司', '本地供应商'],
  ['邯郸市淇咚萌办公设备有限公司', '本地供应商'],
  ['联动时刻（北京）科技有限公司', '本地供应商'],
  ['马鞍山市枫平商贸有限公司', '本地供应商'],
  ['马鞍山市紫金电子科技有限公司', '本地供应商'],
  ['南京市栖霞区辉誉家具销售中心', '本地供应商'],
  ['南京行胜言网络科技有限公司', '本地供应商'],
  ['青海友德商贸有限公司', '本地供应商'],
  ['厦门忻德监测科技有限公司', '本地供应商'],
  ['绍兴市文樟商贸有限公司', '本地供应商'],
  ['绍兴中创信息技术有限公司', '本地供应商'],
  ['西安富百电子科技有限责任公司', '本地供应商'],
  ['西宁市城北区广盛办公家具经销部', '本地供应商'],
  ['新疆三合兴盛电子科技有限公司', '本地供应商'],
  ['宣城中联信息科技有限公司', '本地供应商'],
  ['正元伟业商业集团有限公司', '本地供应商'],
  ['清远市新思维电脑设备有限公司', '本地供应商'],
  ['安徽协君信息科技有限公司', '本地供应商'],
  ['北京中仪慧普科技有限公司', '本地供应商'],
  ['昌吉市思诺办公用品店', '本地供应商'],
  ['昌吉市优美文化办公商行', '本地供应商'],
  ['三丰科技有限公司', '本地供应商'],
  ['沙依巴克区克西街志辰恒业电子产品经销部', '本地供应商'],
  ['上海宝鸟服饰有限公司', '本地供应商'],
  ['苏州红狮商贸有限公司', '本地供应商'],
  ['无锡力卓电脑有限公司', '本地供应商'],
  ['徐州市文佳办公用品经营部', '本地供应商'],
  ['焱垚（天津）实验器材销售有限公司', '本地供应商'],
  ['浙江盛世冠冠科技有限公司', '本地供应商'],
  ['湖南省招', '本地供应商'],
  ['青海纳卡商贸有限公司', '本地供应商'],
  ['西安齐心信息科技有限公司', '本地供应商']
]

const PROFIT_TOTAL = 27137.20
const PERIODS = [
  ['2025-12-01', '2026-02-28'],
  ['2026-03-01', '2026-03-31'],
  ['2026-04-01', '2026-04-30'],
  ['2026-05-01', '2026-06-30'],
  ['2026-07-01', '2026-08-31'],
  ['2026-09-01', '2026-09-30']
]

// 57 组共 105 期：前 8 组各 5 期、接着 8 组各 3 期、其余各 1 期
const SIZES = Array.from({ length: 57 }, (_, i) => (i < 8 ? 5 : i < 16 ? 3 : 1))
const PERIOD_COUNT = SIZES.reduce((a, b) => a + b, 0)

// 生成 105 个假分成金额，并校准合计恰好等于卡片上的 ¥27,137.20
const raw = Array.from({ length: PERIOD_COUNT }, (_, i) => 120 + (i * 47 % 380) + (i % 7) * 3.7)
const factor = PROFIT_TOTAL / raw.reduce((a, b) => a + b, 0)
const profits = raw.map(v => Math.round(v * factor * 100) / 100)
const diff = Math.round((PROFIT_TOTAL - profits.reduce((a, b) => a + b, 0)) * 100) / 100
profits[PERIOD_COUNT - 1] = Math.round((profits[PERIOD_COUNT - 1] + diff) * 100) / 100

let cursor = 0
const groups = SIZES.map((size, gi) => {
  const [name, category] = SUPPLIERS[gi]
  const ratioText = gi % 4 === 0 ? '2%*0.6' : '2.5%*0.6'
  const rate = gi % 4 === 0 ? 0.012 : 0.015
  const details = []
  for (let k = 0; k < size; k++) {
    const idx = cursor++
    const period = PERIODS[(gi + k) % PERIODS.length]
    const profit = profits[idx]
    const invoiced = idx % 3 === 0 ? '待开' : '已开'
    details.push({
      supplier: name,
      category,
      start: period[0],
      end: period[1],
      base: Math.round(profit / rate * 100) / 100,
      ratio: ratioText,
      profit,
      sealed: idx % 3 === 0 ? '待用' : '已用',
      invoiced,
      invoiceAmount: invoiced === '已开' ? profit : 0,
      arrived: idx % 6 < 2 ? '已到账' : '暂未到账',
      progress: idx % 11 === 0 ? '有部分订单未回款，供应商在梳理' : '',
      cycle: '',
      remark: ''
    })
  }
  return {
    id: gi,
    name,
    category,
    ratioText,
    count: size,
    baseTotal: Math.round(details.reduce((s, d) => s + d.base, 0) * 100) / 100,
    profitTotal: Math.round(details.reduce((s, d) => s + d.profit, 0) * 100) / 100,
    arrivedCount: details.filter(d => d.arrived === '已到账').length,
    details
  }
})

const expanded = ref(new Set())

// 供应商名称搜索：like 规则（名称包含关键字即命中，大小写不敏感）
const keyword = ref('')
const filteredGroups = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return groups
  return groups.filter(g => g.name.toLowerCase().includes(q))
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
            <span class="modal-sub">按供应商分组折叠 · 数值为示例数据</span>
          </div>
          <button class="close-btn" aria-label="关闭" @click="emit('close')">×</button>
        </div>

        <div class="modal-metrics">
          <div class="mini-metric">
            <span>累计新点收益</span>
            <b>{{ money(PROFIT_TOTAL) }}</b>
          </div>
          <div class="mini-metric">
            <span>供应商</span>
            <b>{{ groups.length }} 家</b>
          </div>
          <div class="mini-metric">
            <span>结算期数</span>
            <b>{{ PERIOD_COUNT }} 期</b>
          </div>
        </div>

        <div class="table-toolbar">
          <span class="toolbar-hint">点击供应商行展开该组结算期明细，汇总数据从「开始时间」列起展示</span>
          <button class="tool-btn" @click="toggleAll">{{ allExpanded ? '全部收起' : '全部展开' }}</button>
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
  grid-template-columns: repeat(3, 1fr);
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

.tool-btn, .search-box, .hit-count {
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
