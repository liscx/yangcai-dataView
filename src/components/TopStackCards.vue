<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  buyerData: Array,
  supplierData: Array
})

const buyerCardRef = ref(null)
const supplierCardRef = ref(null)
const buyerTbodyRef = ref(null)
const supplierTbodyRef = ref(null)
const containerRef = ref(null)

const activeCard = ref('buyer')
const isAnimating = ref(false)

// 每张子卡片独立的排序模式：'amount' 按金额 / 'count' 按订单
const buyerMode = ref('amount')
const supplierMode = ref('amount')

const sortedBuyerData = computed(() => {
  const data = [...(props.buyerData || [])]
  data.sort((a, b) =>
    buyerMode.value === 'amount' ? b.amount - a.amount : b.count - a.count
  )
  return data.slice(0, 10)
})

const sortedSupplierData = computed(() => {
  const data = [...(props.supplierData || [])]
  data.sort((a, b) =>
    supplierMode.value === 'amount' ? b.amount - a.amount : b.count - a.count
  )
  return data.slice(0, 10)
})

function formatMoney(n) {
  return '¥' + (Math.floor(n / 10000 * 100) / 100).toFixed(2) + '万'
}

// 复制内容用的金额格式：¥ + 千分位 + 两位小数（跟订单日历卡片一致）
function formatAmountYuan(n) {
  return '¥' + Number(n).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function getRankClass(index) {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

// 在指定 tbody 内播放行入场动画
function animateRows(tbodyEl) {
  if (!tbodyEl) return
  nextTick(() => {
    const rows = tbodyEl.querySelectorAll('tr')
    gsap.killTweensOf(rows)
    gsap.fromTo(rows,
      { x: -10, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out' }
    )
  })
}

// 复制按钮的「已复制」高亮状态
const buyerCopied = ref(false)
const supplierCopied = ref(false)

// 复制纯文本到剪贴板（兼容旧浏览器降级）
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // 降级方案
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch (e) {
    return false
  }
}

// 构建 TSV 文本（Tab 分列 + 换行分行，粘贴到 Excel 自动分列）
// 金额带 ¥ 号 + 千分位 + 两位小数（跟订单日历卡片复制格式一致），
// 订单数保持纯数字方便 Excel 识别。
function buildTsv(title, headers, rows) {
  const lines = [title, headers.join('\t')]
  for (const r of rows) {
    lines.push(r.join('\t'))
  }
  return lines.join('\n')
}

async function handleCopy(which) {
  const isBuyer = which === 'buyer'
  const data = isBuyer ? sortedBuyerData.value : sortedSupplierData.value
  const title = isBuyer ? '采购企业 top10' : '供应商 top10'
  const headers = isBuyer
    ? ['排名', '名称', '订单数', '金额']
    : ['排名', '名称', '类型', '订单数', '金额']

  const rows = data.map((item, i) => {
    const row = [i + 1, item.name]
    if (!isBuyer) row.push(item.type || '—')
    row.push(
      item.count,
      // ¥ + 千分位 + 两位小数（去掉浮点误差）
      formatAmountYuan(Math.round(item.amount * 100) / 100)
    )
    return row
  })

  const tsv = buildTsv(title, headers, rows)
  const ok = await copyToClipboard(tsv)
  if (ok) {
    const flag = isBuyer ? buyerCopied : supplierCopied
    flag.value = true
    setTimeout(() => { flag.value = false }, 1500)
  }
}

function switchBuyerMode(newMode) {
  if (buyerMode.value === newMode) return
  buyerMode.value = newMode
  animateRows(buyerTbodyRef.value)
}

function switchSupplierMode(newMode) {
  if (supplierMode.value === newMode) return
  supplierMode.value = newMode
  animateRows(supplierTbodyRef.value)
}

function switchCard(targetCard) {
  if (isAnimating.value || activeCard.value === targetCard) return
  isAnimating.value = true

  const isBuyerFront = activeCard.value === 'buyer'
  const topEl = isBuyerFront ? buyerCardRef.value : supplierCardRef.value
  const behindEl = isBuyerFront ? supplierCardRef.value : buyerCardRef.value

  const tl = gsap.timeline({
    onComplete: () => {
      activeCard.value = targetCard
      gsap.set([topEl, behindEl], { clearProps: 'all' })
      isAnimating.value = false
    }
  })

  tl.to(topEl, { x: -80, y: 30, rotation: -2, opacity: 0, duration: 0.3, ease: 'power1.in' })
  tl.set(behindEl, { zIndex: 2 })
  tl.to(behindEl, { x: 0, y: 0, opacity: 1, duration: 0.6, ease: 'power1.out' })
}

let animationContext = null

onMounted(() => {
  if (!containerRef.value) return
  animationContext = gsap.context(() => {
    // 容器淡入
    gsap.from('.stacked-card-wrapper', {
      y: 30, autoAlpha: 0, duration: 0.6, ease: 'power2.out', clearProps: 'all'
    })
    // 顶层卡片（采购企业 top10）行入场动画
    gsap.from(buyerTbodyRef.value ? buyerTbodyRef.value.querySelectorAll('tr') : [], {
      y: 15, autoAlpha: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out', delay: 0.8
    })
  }, containerRef.value)
})

onUnmounted(() => {
  animationContext?.revert()
})
</script>

<template>
  <div ref="containerRef" class="top-stack">
    <div class="stacked-card-wrapper">
      <!-- 堆叠卡片 1：采购企业 top10 -->
      <article
        ref="buyerCardRef"
        class="panel panel-card"
        :class="activeCard === 'buyer' ? 'is-front' : 'is-back'"
        @click="activeCard !== 'buyer' && switchCard('buyer')"
      >
        <div class="panel-head">
          <div class="head-left">
            <h2>采购企业 top10</h2>
            <button
              class="copy-btn"
              :class="{ 'is-copied': buyerCopied }"
              :title="buyerCopied ? '已复制' : '复制到剪贴板'"
              @click.stop="handleCopy('buyer')"
            >
              <!-- 复制图标 (clipboard) -->
              <svg v-if="!buyerCopied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <!-- 已复制：对勾 -->
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
          <div class="head-right">
            <!-- 按金额 / 按订单 分段控件（每张卡片独立维护 mode）-->
            <div class="seg">
              <button
                :class="{ active: buyerMode === 'amount' }"
                @click.stop="switchBuyerMode('amount')"
              >按金额</button>
              <button
                :class="{ active: buyerMode === 'count' }"
                @click.stop="switchBuyerMode('count')"
              >按订单</button>
            </div>
            <!-- 堆叠层级 Tab：切到供应商 -->
            <div class="card-tab-switcher">
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'buyer' }"
                @click.stop="switchCard('buyer')"
              >🏢 采购</button>
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'supplier' }"
                @click.stop="switchCard('supplier')"
              >🏭 供应</button>
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th class="rank-col">#</th>
              <th>名称</th>
              <th class="num">订单数</th>
              <th class="num">金额</th>
            </tr>
          </thead>
          <tbody ref="buyerTbodyRef">
            <tr
              v-for="(item, index) in sortedBuyerData"
              :key="item.name"
            >
              <td>
                <span class="rank" :class="getRankClass(index)">{{ index + 1 }}</span>
              </td>
              <td class="name-cell" :title="item.name">{{ item.name }}</td>
              <td class="num">{{ item.count }}</td>
              <td class="num font-bold">{{ formatMoney(item.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </article>

      <!-- 堆叠卡片 2：供应商 top10（不区分电商 / 本地） -->
      <article
        ref="supplierCardRef"
        class="panel panel-card"
        :class="activeCard === 'supplier' ? 'is-front' : 'is-back'"
        @click="activeCard !== 'supplier' && switchCard('supplier')"
      >
        <div class="panel-head">
          <div class="head-left">
            <h2>供应商 top10</h2>
            <button
              class="copy-btn"
              :class="{ 'is-copied': supplierCopied }"
              :title="supplierCopied ? '已复制' : '复制到剪贴板'"
              @click.stop="handleCopy('supplier')"
            >
              <svg v-if="!supplierCopied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
          <div class="head-right">
            <div class="seg">
              <button
                :class="{ active: supplierMode === 'amount' }"
                @click.stop="switchSupplierMode('amount')"
              >按金额</button>
              <button
                :class="{ active: supplierMode === 'count' }"
                @click.stop="switchSupplierMode('count')"
              >按订单</button>
            </div>
            <div class="card-tab-switcher">
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'buyer' }"
                @click.stop="switchCard('buyer')"
              >🏢 采购</button>
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'supplier' }"
                @click.stop="switchCard('supplier')"
              >🏭 供应</button>
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th class="rank-col">#</th>
              <th>名称</th>
              <th>类型</th>
              <th class="num">订单数</th>
              <th class="num">金额</th>
            </tr>
          </thead>
          <tbody ref="supplierTbodyRef">
            <tr
              v-for="(item, index) in sortedSupplierData"
              :key="item.name"
            >
              <td>
                <span class="rank" :class="getRankClass(index)">{{ index + 1 }}</span>
              </td>
              <td class="name-cell" :title="item.name">{{ item.name }}</td>
              <td>
                <span
                  class="type-tag"
                  :class="item.type === '电商供应商' ? 'type-ecom' : 'type-local'"
                >{{ item.type || '—' }}</span>
              </td>
              <td class="num">{{ item.count }}</td>
              <td class="num font-bold">{{ formatMoney(item.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* 容器：用于触发 GSAP from 动画 */
.top-stack {
  display: grid;
  gap: 16px;
}

/* 堆叠卡片容器
   高度 = 480px，与 .grid-bottom 中电商/本地供应商 TopTable 等高，
   让底部三列底部对齐。子卡片内部仍用压缩版盒模型（padding 12/14、字号 12.5），
   多出的高度留白给偏移 (8, 6) 凸出空间。 */
.stacked-card-wrapper {
  position: relative;
  width: 100%;
  min-height: 480px;
}

/* 堆叠面板卡片 — 完全复用 TrendCharts.vue 的 panel-card 样式 */
.panel-card {
  position: absolute;
  top: 0;
  left: 0;
  /* 配合下方 is-back 的 transform: translate(8px, 6px)：
     底层卡片 width=100%-8 → 相对父容器左凸 8，
     再加 translate(8, 6) → 右凸出 8、下凸出 6（合计 14px）。 */
  width: calc(100% - 8px);
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: var(--panel, rgba(255, 255, 255, 0.95));
  border: 1px solid var(--panel-border, var(--line, #e2e8f0));
  border-radius: var(--radius, 10px);
  /* 与 TopTable.vue 内部盒模型完全一致：
     padding 16/18、字号 13、td 10，让两列行高逐像素对齐。 */
  padding: 16px 18px;
  overflow: hidden;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}

.panel-card.is-front {
  top: 0;
  left: 0;
  transform: translate(0, 0);
  z-index: 2;
  opacity: 1;
  box-shadow: 0 10px 28px rgba(26, 35, 50, 0.12), 0 2px 6px rgba(37, 99, 235, 0.08);
}

.panel-card.is-back {
  top: 0;
  left: 0;
  /* 偏移从 (14, 12) 调整为 (8, 6)，底层卡片右下凸出 14px，
     适配堆叠容器缩到 410px 后的视觉比例 */
  transform: translate(8px, 6px);
  z-index: 1;
  opacity: 0.92;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(26, 35, 50, 0.08);
  border-color: rgba(37, 99, 235, 0.35);
  background: var(--panel, rgba(255, 255, 255, 0.92));
}

.panel-card.is-back .panel-head,
.panel-card.is-back table {
  pointer-events: none;
}

.panel-card.is-back:hover {
  opacity: 0.98;
  border-color: #3b82f6;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.18);
}

.panel-card.is-back:hover .panel-head,
.panel-card.is-back:hover table {
  opacity: 0.45;
}

/* 卡片层级 Tab — 紧凑风格 */
.card-tab-switcher {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: #f1f5f9;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.tab-btn {
  border: 0;
  background: transparent;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.tab-btn:hover:not(.active) {
  color: #1e293b;
}

/* Panel 基础样式 — 兼容全局 .panel 视觉 */
.panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  /* 防止两个 segment 互相挤压 */
  gap: 8px;
}

.panel-head h2 {
  font-size: 18px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 标题 + 复制按钮的左侧容器 */
.head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* 复制按钮 — 小 icon 按钮，hover 高亮、is-copied 变绿 */
.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 0;
  background: #f1f5f9;
  border-radius: 5px;
  cursor: pointer;
  color: #64748b;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.copy-btn:active {
  transform: scale(0.92);
}

.copy-btn.is-copied {
  background: #d1fae5;
  color: #059669;
}

.copy-btn svg {
  display: block;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* 表格样式 — 与 TopTable.vue 完全一致（字号 13、th 9、td 10），
   让堆叠卡片与电商/本地供应商 TopTable 行高逐像素对齐。 */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th {
  color: var(--muted);
  font-weight: 600;
  text-align: left;
  padding: 9px 6px;
  border-bottom: 1px solid var(--line);
}

th.num {
  text-align: right;
}

td {
  padding: 10px 6px;
  border-bottom: 1px solid #edf1f7;
  vertical-align: middle;
}

td.num {
  text-align: right;
}

td.num.font-bold {
  font-weight: 700;
  color: #263149;
}

.name-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank {
  display: inline-grid;
  place-items: center;
  width: 23px;
  height: 23px;
  border-radius: 7px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  background: var(--muted);
}

.rank-gold {
  background: linear-gradient(135deg, #f6c343, #d89a2b);
}

.rank-silver {
  background: linear-gradient(135deg, #a8b5c8, #8896ab);
}

.rank-bronze {
  background: linear-gradient(135deg, #cd8c52, #b06c3a);
}

/* 供应商类型标签 — 电商供应商 / 本地供应商 */
.type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.type-ecom {
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  border: 1px solid rgba(37, 99, 235, 0.3);
}

.type-local {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
</style>
