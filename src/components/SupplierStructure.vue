<script setup>
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  supplierTypes: Array,
  kpis: Object
})

const containerRef = ref(null)

const totalOrders = props.kpis.totalOrders
const totalAmount = props.kpis.totalAmount

const local = props.supplierTypes.find(x => x.name.includes('本地')) || { count: 0, amount: 0 }
const ecommerce = props.supplierTypes.find(x => x.name.includes('电商')) || { count: 0, amount: 0 }

const localCountPct = Math.round(local.count / totalOrders * 100)
const ecommerceCountPct = Math.round(ecommerce.count / totalOrders * 100)
const localAmountPct = Math.round(local.amount / totalAmount * 100)
const ecommerceAmountPct = Math.round(ecommerce.amount / totalAmount * 100)

function fmtMoney(n) {
  return (Math.floor(n / 10000 * 100) / 100).toFixed(2) + '万'
}

function fmtFull(n) {
  return Number(n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

onMounted(() => {
  if (!containerRef.value) return
  gsap.from(containerRef.value.querySelectorAll('.structure-card'), {
    y: 15,
    opacity: 0,
    duration: 0.5,
    stagger: 0.15,
    ease: 'power2.out',
    delay: 0.6,
    clearProps: 'all'
  })
})
</script>

<template>
  <article ref="containerRef" class="panel">
    <div class="panel-head">
      <h2>供应商类型结构</h2>
      <span class="note">订单数 / 金额</span>
    </div>
    <div class="type-matrix">
      <!-- 订单数结构 -->
      <div class="structure-card">
        <h3>订单数结构</h3>
        <div class="structure-grid">
          <div class="structure-cell local">
            <span>本地供应商</span>
            <strong>{{ local.count }} 单</strong>
            <em>占比 {{ localCountPct }}%</em>
          </div>
          <div class="structure-cell ecommerce">
            <span>电商供应商</span>
            <strong>{{ ecommerce.count }} 单</strong>
            <em>占比 {{ ecommerceCountPct }}%</em>
          </div>
        </div>
        <div class="compare-title">
          <span>本地 {{ localCountPct }}%</span>
          <span>电商 {{ ecommerceCountPct }}%</span>
        </div>
        <div class="stack">
          <span :style="{ width: localCountPct + '%' }"></span>
          <span :style="{ width: ecommerceCountPct + '%' }"></span>
        </div>
      </div>

      <!-- 订单金额结构 -->
      <div class="structure-card">
        <h3>订单金额结构</h3>
        <div class="structure-grid">
          <div class="structure-cell local">
            <span>本地供应商</span>
            <strong>¥{{ fmtMoney(local.amount) }}</strong>
            <em>{{ fmtFull(local.amount) }} 元，占比 {{ localAmountPct }}%</em>
          </div>
          <div class="structure-cell ecommerce">
            <span>电商供应商</span>
            <strong>¥{{ fmtMoney(ecommerce.amount) }}</strong>
            <em>{{ fmtFull(ecommerce.amount) }} 元，占比 {{ ecommerceAmountPct }}%</em>
          </div>
        </div>
        <div class="compare-title">
          <span>本地 {{ localAmountPct }}%</span>
          <span>电商 {{ ecommerceAmountPct }}%</span>
        </div>
        <div class="stack">
          <span :style="{ width: localAmountPct + '%' }"></span>
          <span :style="{ width: ecommerceAmountPct + '%' }"></span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.panel {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}

h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
  color: var(--ink);
  font-weight: 700;
}

.note {
  color: var(--muted);
  font-size: 12px;
}

.type-matrix {
  display: grid;
  gap: 16px;
}

.structure-card {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255,255,255,.72);
}

.structure-card h3 {
  margin: 0 0 12px;
  font-size: 15px;
  color: #263149;
}

.structure-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.structure-cell {
  padding: 12px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(246,249,253,.84));
  border: 1px solid #e6edf7;
}

.structure-cell span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.structure-cell strong {
  display: block;
  margin-top: 6px;
  font-size: 20px;
}

.structure-cell.local strong {
  color: var(--teal);
}

.structure-cell.ecommerce strong {
  color: var(--blue);
}

.structure-cell em {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-style: normal;
  font-size: 12px;
}

.compare-title {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 7px;
}

.stack {
  display: flex;
  height: 16px;
  border-radius: 99px;
  overflow: hidden;
  background: #edf1f7;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.7);
}

.stack span:first-child {
  background: var(--teal);
}

.stack span:last-child {
  background: var(--blue);
}
</style>
