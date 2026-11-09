<script setup>
// 各专区供应商规模（预留卡片内容）
// 本地供应商总数：取自「供应商列表20261109160622.xlsx」各专区真实分布（282 家 / 23 个专区）
// 其余字段（电商挂载数、有订单数、转化率、付款情况）目前均为假数据，后续接真数据时替换 MOCK_RATIO 即可
import { computed, ref } from 'vue'

const LOCAL_ZONES = [
  { name: '中国煤地电子商城', localTotal: 89 },
  { name: '新疆阳光采购平台', localTotal: 43 },
  { name: '新疆光正阳光优采平台', localTotal: 37 },
  { name: '绍兴市阳光采购商城', localTotal: 24 },
  { name: '小马易采电子商城', localTotal: 18 },
  { name: '陕西省阳光优采平台', localTotal: 18 },
  { name: '海南阳光采购平台', localTotal: 14 },
  { name: '湖南省招标公司阳光优采', localTotal: 12 },
  { name: '泰安市e采通', localTotal: 4 },
  { name: '安徽省阳光优采平台', localTotal: 4 },
  { name: '国弘热力阳光优采', localTotal: 3 },
  { name: 'tenantguid:暂未配置专区', localTotal: 2 },
  { name: '邯郸市阳光优采平台', localTotal: 2 },
  { name: '宣城市阳光优采商城', localTotal: 2 },
  { name: '兵团中新建阳光优采平台', localTotal: 2 },
  { name: '株洲市国资委阳光优采专区', localTotal: 1 },
  { name: '聊城泰岳置业有限公司阳光优采平台', localTotal: 1 },
  { name: '郑州国企采购服务中心阳光优采', localTotal: 1 },
  { name: '广东国义招标代理阳光优采商城', localTotal: 1 },
  { name: '辽宁工程阳光采购平台电子商城', localTotal: 1 },
  { name: '国泰新点阳光优采专区', localTotal: 1 },
  { name: '酒泉市国企采购阳光优采', localTotal: 1 },
  { name: '福州国资阳光采购商城', localTotal: 1 }
]

// 全局电商供应商池 32 家，各专区挂载数略有偏差（28~32）
const ECOM_POOL = 32
const MAX_SCALE = 90

const rows = computed(() => LOCAL_ZONES.map((z, i) => {
  const localOrdered = Math.min(z.localTotal, Math.round(z.localTotal * (0.55 + (i % 5) * 0.05)))
  const ecomTotal = ECOM_POOL - (i % 5)
  const ecomOrdered = Math.round(ecomTotal * (0.60 + (i % 4) * 0.06))
  const total = z.localTotal + ecomTotal
  const ordered = localOrdered + ecomOrdered
  const rate = Math.round(ordered / total * 100)
  // 付款情况：有订单的供应商中已付款的比例
  const payRate = 0.55 + (i % 7) * 0.05
  const paid = Math.round(ordered * payRate)
  const payPct = Math.round(payRate * 100)
  return {
    name: z.name,
    localTotal: z.localTotal,
    localOrdered,
    ecomTotal,
    ecomOrdered,
    total,
    ordered,
    rate,
    paid,
    payable: ordered,
    payPct
  }
}))

// 专区名称搜索：like 规则（名称包含关键字即命中，大小写不敏感）
const keyword = ref('')
const filteredRows = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(r => r.name.toLowerCase().includes(q))
})

function outerWidth(total) {
  return Math.max(6, Math.round(total / MAX_SCALE * 100)) + '%'
}

function innerWidth(ordered, total) {
  return Math.round(ordered / total * 100) + '%'
}

function payColor(pct) {
  if (pct >= 80) return 'var(--green)'
  if (pct >= 60) return 'var(--gold)'
  return 'var(--red)'
}
</script>

<template>
  <article class="panel zone-scale">
    <div class="scale-inner">
      <div class="panel-head">
        <h2>各专区供应商规模</h2>
        <div class="head-right">
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
        <span>付款 = 已付家数 / 应付款家数</span>
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
            :title="`有订单供应商 ${row.ordered} 家 / 总家数 ${row.total} 家 = ${row.rate}%`"
          >转化率 <b>{{ row.rate }}%</b></span>
            <span
              class="metric pay"
              :style="{ color: payColor(row.payPct) }"
              :title="`已付 ${row.paid} / 应付款 ${row.payable} 家`"
            >付款 <b>{{ row.payPct }}%</b></span>
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
