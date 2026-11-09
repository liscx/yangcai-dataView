<script setup>
import { onMounted, onUnmounted, ref, watch, nextTick, provide } from 'vue'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import DATA from './data/dashboard.json'
import HeroSection from './components/HeroSection.vue'
import KpiCards from './components/KpiCards.vue'
import SettlementMetrics from './components/SettlementMetrics.vue'
import StackPair from './components/StackPair.vue'
import AiInsightBar from './components/AiInsightBar.vue'
import ZoneRanking from './components/ZoneRanking.vue'
import ZoneSupplierScale from './components/ZoneSupplierScale.vue'
import OrderStatus from './components/OrderStatus.vue'
import CategoryTop10 from './components/CategoryTop10.vue'
import TrendCharts from './components/TrendCharts.vue'
import SupplierStructure from './components/SupplierStructure.vue'
import AmountBands from './components/AmountBands.vue'
import SupplierContribution from './components/SupplierContribution.vue'
import TopStackCards from './components/TopStackCards.vue'
import SupplierTypeStackCards from './components/SupplierTypeStackCards.vue'
import ProductPurchaseTop10 from './components/ProductPurchaseTop10.vue'
import DashboardFooter from './components/DashboardFooter.vue'

const appRef = ref(null)
const scaleStageRef = ref(null)
const scaleRef = ref(null)
const password = ref('')
const errorMsg = ref('')
const PASS = 'ygyc@2026'
const authed = ref(false)
const scaleRatio = ref(window.innerWidth / 1920)
const showAiInsight = ref(false)
const dashboardReady = ref(false)
const entryMethod = ref('')  // 记录本次进入方式：'password' | 'logo-backdoor'

provide('authed', authed)

function updateScale() {
  scaleRatio.value = window.innerWidth / 1920
  nextTick(() => fitScaleHeight())
}

let fitHeightFrame = 0

function fitScaleHeight() {
  if (!scaleRef.value || !scaleStageRef.value) return
  cancelAnimationFrame(fitHeightFrame)
  fitHeightFrame = requestAnimationFrame(() => {
    if (!scaleRef.value || !scaleStageRef.value) return
    // 内层保持 1920px 画布和 transform 缩放，外层只负责占用缩放后的视觉高度
    const rect = scaleRef.value.getBoundingClientRect()
    scaleStageRef.value.style.height = `${Math.ceil(rect.height)}px`
  })
}

let scaleResizeObserver = null

let clickCount = 0
let clickTimer = null

function onLogoClick() {
  clickCount++
  clearTimeout(clickTimer)
  if (clickCount >= 4) {
    entryMethod.value = 'logo-backdoor'
    authed.value = true
    clickCount = 0
    return
  }
  clickTimer = setTimeout(() => { clickCount = 0 }, 800)
}

function checkPassword() {
  if (password.value === PASS) {
    entryMethod.value = 'password'
    authed.value = true
    errorMsg.value = ''
  } else {
    errorMsg.value = '密码错误，请重试'
    password.value = ''
  }
}

// 访问者 IP / 客户端上下文记录：
// 登录成功后（包括密码 + logo 4 连击后门两条路径）触发，
// 让 Vite dev middleware 拿到访问者真实 IP 并 append 到 src/assets/visitor_log_YYYY-MM-DD.csv。
async function recordVisit(entry) {
  try {
    // 1. 先问后端要 IP
    const ipRes = await fetch('/api/client-ip')
    const {ip} = await ipRes.json()

    // 2. 带上前端上下文 POST 给后端写日志
    await fetch('/api/log-visit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        time: new Date().toISOString(),
        ip,
        path: window.location.pathname,
        ua: navigator.userAgent,
        referer: document.referrer,
        entry,                                                // 'password' | 'logo-backdoor'
        screen: `${window.screen.width}x${window.screen.height}`,
        lang: navigator.language,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    })
  } catch (err) {
    // 静默失败 — 不影响正常登录
    console.warn('[visitor-log] failed:', err)
  }
}

// 3分钟无操作自动锁定
let lockTimer = null
const LOCK_TIMEOUT = 3 * 60 * 1000

function resetLockTimer() {
  clearTimeout(lockTimer)
  lockTimer = setTimeout(() => { authed.value = false }, LOCK_TIMEOUT)
}

const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
function bindActivity() {
  activityEvents.forEach(e => window.addEventListener(e, resetLockTimer, { passive: true }))
  resetLockTimer()
}
function unbindActivity() {
  clearTimeout(lockTimer)
  activityEvents.forEach(e => window.removeEventListener(e, resetLockTimer))
}

watch(authed, val => {
  if (val) {
    dashboardReady.value = true
    bindActivity()
    nextTick(() => ScrollTrigger.refresh())
    // 进入成功（密码 / logo 4 连击后门），向 Vite middleware 报告本次访问
    recordVisit(entryMethod.value || 'unknown')
  } else {
    unbindActivity()
    password.value = ''
  }
})

onMounted(() => {
  window.addEventListener('resize', updateScale)
  // 内容渲染后修正高度
  nextTick(() => fitScaleHeight())
  // 监听内容尺寸变化
  if (scaleRef.value) {
    scaleResizeObserver = new ResizeObserver(() => fitScaleHeight())
    scaleResizeObserver.observe(scaleRef.value)
  }
})

onUnmounted(() => {
  unbindActivity()
  window.removeEventListener('resize', updateScale)
  cancelAnimationFrame(fitHeightFrame)
  scaleResizeObserver?.disconnect()
})
</script>

<template>
  <!-- 密码验证遮罩 -->
  <div v-if="!authed" class="auth-overlay">
    <div class="auth-box">
      <div class="auth-logo" @click="onLogoClick">🌈</div>
      <h1>阳光优采数据看板</h1>
      <p>请输入访问密码</p>
      <form @submit.prevent="checkPassword">
        <input
          v-model="password"
          type="password"
          placeholder="请输入密码"
          autofocus
        />
        <button type="submit">进入</button>
      </form>
      <p v-if="errorMsg" class="err">{{ errorMsg }}</p>
    </div>
  </div>

  <div ref="scaleStageRef" class="scale-stage">
    <div ref="scaleRef" class="page-scale" :style="{ transform: `scale(${scaleRatio})`, transformOrigin: 'left top', width: '1920px' }">
    <main v-if="dashboardReady" ref="appRef" class="shell" :class="{ blurred: !authed }">
    <!-- 标题卡片：单独一行 -->
    <div class="hero-row">
      <HeroSection
        :generated-at="DATA.generatedAt"
        :data-end-date="DATA.dataEndDate"
        @ai-analyze="showAiInsight = !showAiInsight"
      />
    </div>

    <!-- 顶部指标行：左侧 KPI 卡片 + 右侧对账结算 3×2（暂用假数据） -->
    <div class="top-metrics">
      <div class="metric-group">
        <div class="metric-group-head">
          <span class="metric-group-title">销售指标</span>
          <span class="metric-group-note">交易数据截至 {{ DATA.dataEndDate }}</span>
        </div>
        <KpiCards :kpis="DATA.kpis" />
      </div>
      <SettlementMetrics />
    </div>

    <!-- AI 解读栏 -->
    <div class="ai-bar-wrapper">
      <AiInsightBar
        :active="showAiInsight"
        :dashboard-data="DATA"
        @close="showAiInsight = false"
      />
    </div>

    <!-- 主要内容网格 -->
    <section class="grid">
      <!-- 左列：第 2、3 行合并放「各专区供应商规模」，与中列「近7天订单趋势」等高 -->
      <div class="column-stack column-left">
        <ZoneRanking
          :zone-rank="DATA.zoneRank"
        />
        <ZoneSupplierScale class="left-zone-scale" />
      </div>

      <!-- 中列 -->
      <div class="column-stack column-middle">
        <TrendCharts
          :month-trend="DATA.monthTrend"
          :month-trend-zones="DATA.monthTrendZones"
          :calendar-data="DATA.calendarData"
          :week-trend="DATA.weekTrend"
          :week-trend-zones="DATA.weekTrendZones"
          :monthly-summary="DATA.monthlySummary"
        />
      </div>

      <!-- 右列：第 2 行为堆叠卡（订单状态分布 / 订单金额分层） -->
      <div class="column-stack column-right">
        <SupplierStructure
          :supplier-types="DATA.supplierTypes"
          :kpis="DATA.kpis"
        />
        <!-- 堆叠：订单状态分布（前） / 订单金额分层（后，被堆叠） -->
        <StackPair front-label="订单状态" back-label="金额分层">
          <template #front="{ stackTabs }">
            <OrderStatus :status-rank="DATA.statusRank" :stack-tabs="stackTabs" />
          </template>
          <template #back="{ stackTabs }">
            <AmountBands :amount-bands="DATA.amountBands" :stack-tabs="stackTabs" />
          </template>
        </StackPair>
        <SupplierContribution
          :zone-rank="DATA.zoneRank"
          :new-zones="DATA.newZones"
        />
      </div>
    </section>

    <!-- 底部表格区域 -->
    <section class="grid-bottom">
      <TopStackCards
        :buyer-data="DATA.buyerRank"
        :supplier-data="DATA.supplierRank"
      />
      <SupplierTypeStackCards
        :ecommerce-data="DATA.ecommerceSuppliers"
        :local-data="DATA.localSuppliers"
      />
      <!-- 底部第 3 列：堆叠卡（三级类目 Top10 / 商品采购 top10） -->
      <StackPair front-label="三级类目" back-label="商品采购">
        <template #front="{ stackTabs }">
          <CategoryTop10 :data="DATA.categoryTop10" :stack-tabs="stackTabs" />
        </template>
        <template #back="{ stackTabs }">
          <ProductPurchaseTop10 :data="DATA.productPurchase" :stack-tabs="stackTabs" />
        </template>
      </StackPair>
    </section>

    <!-- 底部 -->
    <DashboardFooter />
    </main>
    </div>
  </div>
</template>

<style scoped>
.scale-stage {
  position: relative;
  width: 100%;
}

.page-scale {
  position: absolute;
  top: 0;
  left: 0;
}

.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(70px);
  -webkit-backdrop-filter: blur(70px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-box {
  background: #fff;
  border-radius: 16px;
  padding: 48px 40px 40px;
  width: 380px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.auth-logo {
  font-size: 48px;
  margin-bottom: 12px;
}

.auth-box h1 {
  margin: 0 0 8px;
  font-size: 22px;
  color: #1a2332;
  font-weight: 700;
}

.auth-box p {
  margin: 0 0 20px;
  color: #6b7280;
  font-size: 14px;
}

.auth-box form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-box input {
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.auth-box input:focus {
  border-color: #3b82f6;
}

.auth-box button {
  border: 0;
  border-radius: 10px;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #ef4444, #f59e0b);
  cursor: pointer;
  transition: opacity 0.2s;
}

.auth-box button:hover {
  opacity: 0.9;
}

.auth-box .err {
  color: #ef4444;
  margin: 4px 0 0;
  font-size: 13px;
}

.shell {
  padding: 26px;
  max-width: 1920px;
  margin: 0 auto;
}

.shell.blurred {
  filter: blur(16px);
}

.grid {
  display: grid;
  grid-template-columns: 1.16fr 1.7fr .98fr;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.column-stack {
  display: grid;
  gap: 16px;
  grid-template-rows: subgrid;
  grid-row: span 3;
}

/* 左列「各专区供应商规模」跨第 2~3 行：与中列「近7天订单趋势」(grid-row 2/4) 等高，
   宽度与同列的「专区排行榜」一致 */
.left-zone-scale {
  grid-row: 2 / 4;
  min-height: 0;
  overflow: hidden;
}

.column-middle {
  grid-template-rows: subgrid;
}

.column-middle > * {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: 1 / -1;
}

.column-middle > * > :first-child {
  grid-row: 1;
}

.column-middle > * > :last-child {
  grid-row: 2 / 4;
}

.hero-row {
  display: block;
  margin-bottom: 12px;
}

.top-metrics {
  /* 统一卡片宽度：左 6 列 + 右 3 列 = 9 列，卡片间距 10px、组间距 16px
     设单卡宽 c，则 100% = 9c + 7*10px(组内间距) + 16px(组间距)
     => c = (100% - 86px) / 9，左右两侧按各自列数反推容器宽度，
        两组卡片因此严格等宽，配合 stretch 也严格等高 */
  --card-w: calc((100% - 86px) / 9);
  display: grid;
  grid-template-columns:
    calc(var(--card-w) + var(--card-w) + var(--card-w) + var(--card-w) + var(--card-w) + var(--card-w) + 50px)
    calc(var(--card-w) + var(--card-w) + var(--card-w) + 20px);
  gap: 16px;
  align-items: stretch;
}

.metric-group {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ai-bar-wrapper {
  margin-top: 16px;
}

.grid-bottom {
  display: grid;
  grid-template-columns: 1.18fr 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}


</style>
