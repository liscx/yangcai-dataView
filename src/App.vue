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

onMounted(() => {
  // 初始化 ScrollTrigger
  ScrollTrigger.refresh()
})
</script>

<template>
  <main ref="appRef" class="shell">
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
        />
      </div>

      <!-- 中列 -->
      <div class="column-stack column-middle">
        <TrendCharts
          :month-trend="DATA.monthTrend"
          :month-trend-zones="DATA.monthTrendZones"
          :week-trend="DATA.weekTrend"
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
.shell {
  padding: 26px;
  max-width: 1920px;
  margin: 0 auto;
}

.grid {
  display: grid;
  grid-template-columns: 1.16fr 1.7fr .98fr;
  grid-template-rows: auto auto 1fr;
  gap: 16px;
  margin-top: 16px;
  align-items: stretch;
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

/* 响应式：移动端隐藏（保持原设计的 min-width） */
@media (max-width: 1179px) {
  .shell {
    display: none;
  }

  body::after {
    content: '请使用 1180px 以上宽度访问';
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-size: 18px;
    color: var(--muted);
  }
}
</style>
