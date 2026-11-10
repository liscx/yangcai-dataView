<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import ProfitDetailModal from './ProfitDetailModal.vue'

// 数据接入 dashboard-gysdz.json（由 gen_gysdz.py 从源数据提取，口径与 calc_settlement_metrics.py 一致）
import GYSDZ from '../data/dashboard-gysdz.json'
const S = GYSDZ.settlement

const sectionRef = ref(null)
const showProfitModal = ref(false)
let animationContext = null

function exact(value) {
  return '¥' + value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function exactYuan(value) {
  return '¥' + Math.round(value).toLocaleString('zh-CN')
}

const cards = [
  {
    label: '供应商结算基数总额',
    value: S.baseTotal,
    format: 'money',
    hint: `结算基数合计（${S.periodCount} 期）`,
    color: '#b7791f'
  },
  {
    label: '供应商已结算总金额',
    value: S.settledAmount,
    format: 'money',
    hint: `用印/开票期数：${S.settledPeriods}`,
    color: '#0d9488'
  },
  {
    label: '新点应收分成',
    value: S.newProfit,
    format: 'money',
    hint: exact(S.newProfit),
    color: '#2563eb',
    interactive: true
  },
  {
    label: '新点已收分成',
    value: S.newProfitArrived,
    format: 'money',
    hint: `已到账 ${S.arrivedCount} 期`,
    color: '#16a34a'
  }
]

function formatValue(value, format) {
  if (format === 'money') {
    if (value >= 10000) return '¥' + (Math.floor(value / 10000 * 100) / 100).toFixed(2) + '万'
    return '¥' + Math.floor(value).toLocaleString('zh-CN')
  }
  if (format === 'percent') return value.toFixed(2) + '%'
  return Math.round(value).toLocaleString('zh-CN')
}

onMounted(() => {
  if (!sectionRef.value) return

  animationContext = gsap.context(() => {
    const cardElements = sectionRef.value.querySelectorAll('.kpi')
    gsap.from(cardElements, {
      y: 24,
      autoAlpha: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power2.out',
      clearProps: 'transform,opacity,visibility'
    })

    cardElements.forEach((card, index) => {
      const valueEl = card.querySelector('.value')
      const cardData = cards[index]
      const obj = { value: 0 }
      gsap.to(obj, {
        value: cardData.value,
        duration: 1.5,
        delay: 0.3 + index * 0.1,
        ease: 'power2.out',
        onUpdate: () => {
          valueEl.textContent = formatValue(obj.value, cardData.format)
        }
      })
    })
  }, sectionRef.value)
})

onUnmounted(() => animationContext?.revert())
</script>

<template>
  <section ref="sectionRef" class="settlement-metrics">
    <div class="metric-group-head">
      <span class="metric-group-title">对账结算指标</span>
      <span class="metric-group-note">结算数据截至 {{ S.dataEndDate }}</span>
    </div>
    <div class="kpis">
      <div
        v-for="(card, index) in cards"
        :key="index"
        class="kpi"
        :class="{ 'is-clickable': card.interactive }"
        :style="{ borderTopColor: card.color }"
        :aria-label="card.interactive ? '点击查看新点收益明细数据' : null"
        @click="card.interactive && (showProfitModal = true)"
      >
        <span v-if="card.interactive" class="detail-link" aria-hidden="true">查看详情</span>
        <span v-if="card.interactive" class="hover-tip">点击查看新点收益明细数据</span>
        <div class="label">{{ card.label }}</div>
        <div class="value">{{ formatValue(card.value, card.format) }}</div>
        <div class="hint">{{ card.hint }}</div>
      </div>
    </div>
    <ProfitDetailModal :open="showProfitModal" @close="showProfitModal = false" />
  </section>
</template>

<style scoped>
.settlement-metrics {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.kpis {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, 1fr);
  align-content: stretch;
  gap: 10px;
  align-items: stretch;
}

.kpi {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 8px 10px;
  border-top: 2px solid;
  transition: box-shadow var(--transition), transform var(--transition), border-color var(--transition);
  cursor: default;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}

/* 可交互提示：全部用绝对定位 / 光标 / 描边，不占布局、不改变卡片长宽 */
.kpi.is-clickable {
  cursor: pointer;
}

.kpi.is-clickable:hover {
  border-color: rgba(37, 99, 235, 0.45);
  border-top-color: var(--blue);
}

/* 右上角「查看详情」文字链接：蓝色带下划线，绝对定位不占布局 */
.detail-link {
  position: absolute;
  top: 7px;
  right: 9px;
  color: var(--blue);
  font-size: 11px;
  line-height: 1.2;
  text-decoration: underline;
  text-underline-offset: 2px;
  pointer-events: none;
}

.kpi.is-clickable:hover .detail-link {
  text-decoration-thickness: 2px;
}

/* hover 时在右上角「查看详情」下方浮出提示框：绝对定位，不占布局、不改卡片长宽 */
.hover-tip {
  position: absolute;
  top: 28px;
  right: 8px;
  z-index: 30;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(26, 35, 50, 0.94);
  color: #fff;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 6px 16px rgba(26, 35, 50, 0.22);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s;
  pointer-events: none;
}

.hover-tip::before {
  content: "";
  position: absolute;
  top: -5px;
  right: 10px;
  width: 9px;
  height: 9px;
  background: rgba(26, 35, 50, 0.94);
  transform: rotate(45deg);
}

.kpi.is-clickable:hover .hover-tip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.kpi:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.label {
  color: var(--muted);
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.value {
  margin-top: 3px;
  font-size: 30px;
  font-weight: 800;
  white-space: nowrap;
  color: var(--ink);
  line-height: 1.2;
}

.hint {
  margin-top: 2px;
  color: var(--muted);
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
