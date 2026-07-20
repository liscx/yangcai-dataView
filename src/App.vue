<script setup>
import { onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import DATA from './data/dashboard.json'
import HeroSection from './components/HeroSection.vue'
import KpiCards from './components/KpiCards.vue'
import ZoneRanking from './components/ZoneRanking.vue'
import OrderStatus from './components/OrderStatus.vue'
import ProcurementFocus from './components/ProcurementFocus.vue'
import TrendCharts from './components/TrendCharts.vue'
import SupplierStructure from './components/SupplierStructure.vue'
import AmountBands from './components/AmountBands.vue'
import SupplierContribution from './components/SupplierContribution.vue'
import TopTable from './components/TopTable.vue'
import DashboardFooter from './components/DashboardFooter.vue'

const appRef = ref(null)
const password = ref('')
const errorMsg = ref('')
const PASS = 'ygyc@2026'
const authed = ref(false)
let clickCount = 0
let clickTimer = null

function onLogoClick() {
  clickCount++
  clearTimeout(clickTimer)
  if (clickCount >= 4) {
    authed.value = true
    clickCount = 0
    return
  }
  clickTimer = setTimeout(() => { clickCount = 0 }, 800)
}

function checkPassword() {
  if (password.value === PASS) {
    authed.value = true
    errorMsg.value = ''
  } else {
    errorMsg.value = '密码错误，请重试'
    password.value = ''
  }
}

onMounted(() => {
  ScrollTrigger.refresh()
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

  <main ref="appRef" class="shell" :class="{ blurred: !authed }">
    <!-- Hero + KPI 合并行 -->
    <div class="hero-kpi-row">
      <HeroSection
        :generated-at="DATA.generatedAt"
        :data-end-date="DATA.dataEndDate"
        :source="DATA.source"
      />
      <KpiCards
        :kpis="DATA.kpis"
        :supplier-types="DATA.supplierTypes"
      />
    </div>

    <!-- 主要内容网格 -->
    <section class="grid">
      <!-- 左列 -->
      <div class="column-stack column-left">
        <ZoneRanking :zone-rank="DATA.zoneRank" />
        <OrderStatus :status-rank="DATA.statusRank" />
        <ProcurementFocus
          :buyer-rank="DATA.buyerRank"
          :kpis="DATA.kpis"
          :month-trend="DATA.monthTrend"
          :new-zones="DATA.newZones"
        />
      </div>

      <!-- 中列 -->
      <div class="column-stack column-middle">
        <TrendCharts
          :month-trend="DATA.monthTrend"
          :month-trend-zones="DATA.monthTrendZones"
          :week-trend="DATA.weekTrend"
          :week-trend-zones="DATA.weekTrendZones"
        />
      </div>

      <!-- 右列 -->
      <div class="column-stack column-right">
        <SupplierStructure
          :supplier-types="DATA.supplierTypes"
          :kpis="DATA.kpis"
        />
        <AmountBands :amount-bands="DATA.amountBands" />
        <SupplierContribution
          :supplier-rank="DATA.supplierRank"
          :kpis="DATA.kpis"
          :zone-rank="DATA.zoneRank"
        />
      </div>
    </section>

    <!-- 底部表格区域 -->
    <section class="grid-bottom">
      <TopTable
        title="采购企业 top10"
        :data="DATA.buyerRank"
      />
      <TopTable
        title="电商供应商 top10"
        :data="DATA.ecommerceSuppliers"
      />
      <TopTable
        title="本地供应商 top10"
        :data="DATA.localSuppliers"
      />
    </section>

    <!-- 底部 -->
    <DashboardFooter />
  </main>
</template>

<style scoped>
.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
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
  filter: blur(6px);
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

.hero-kpi-row {
  display: grid;
  grid-template-columns: 1.16fr 2.68fr;
  gap: 16px;
  align-items: stretch;
}

.grid-bottom {
  display: grid;
  grid-template-columns: 1.18fr 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

</style>
