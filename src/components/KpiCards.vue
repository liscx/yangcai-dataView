<script setup>
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  kpis: Object,
  supplierTypes: Array
})

const cardsRef = ref(null)
const valueRefs = ref([])

const local = props.supplierTypes.find(x => x.name.includes('本地')) || { amount: 0, count: 0 }
const ecommerce = props.supplierTypes.find(x => x.name.includes('电商')) || { amount: 0, count: 0 }
const localCountPct = Math.round(local.count / Math.max(1, props.kpis.totalOrders) * 100)
const ecommerceCountPct = Math.round(ecommerce.count / Math.max(1, props.kpis.totalOrders) * 100)

const cards = [
  {
    label: '总交易收益',
    value: props.kpis.totalAmount,
    format: 'money',
    hint: `累计订单金额 ${props.kpis.totalAmount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元`,
    color: '#2563eb'
  },
  {
    label: '总订单数',
    value: props.kpis.totalOrders,
    format: 'number',
    hint: `笔均 ¥${Math.round(props.kpis.avgAmount).toLocaleString('zh-CN')}`,
    color: '#0d9488'
  },
  {
    label: '本周交易',
    value: props.kpis.weekAmount,
    format: 'money',
    hint: `本周订单 ${props.kpis.weekOrders} 笔`,
    color: '#b7791f'
  },
  {
    label: '活跃专区',
    value: props.kpis.zoneCount,
    format: 'number',
    hint: `采购企业 ${props.kpis.buyerCount} 家`,
    color: '#7c3aed'
  },
  {
    label: '供应商数',
    value: props.kpis.supplierCount,
    format: 'number',
    hint: `本地 ${localCountPct}% / 电商 ${ecommerceCountPct}%`,
    color: '#16a34a'
  },
  {
    label: '集中度',
    value: Math.round(props.kpis.buyerTop10Share * 100),
    format: 'percent',
    hint: `供应商 TOP10 占 ${Math.round(props.kpis.supplierTop10Share * 100)}%`,
    color: '#c53030'
  }
]

function formatValue(value, format) {
  if (format === 'money') {
    if (value >= 10000) return '¥' + (value / 10000).toFixed(1) + '万'
    return '¥' + Math.round(value).toLocaleString('zh-CN')
  }
  if (format === 'percent') return value + '%'
  return Math.round(value).toLocaleString('zh-CN')
}

onMounted(() => {
  if (!cardsRef.value) return

  // 卡片入场动画
  const cardElements = cardsRef.value.querySelectorAll('.kpi')
  gsap.from(cardElements, {
    y: 30,
    opacity: 0,
    duration: 0.6,
    stagger: 0.08,
    ease: 'power2.out',
    clearProps: 'transform,opacity'
  })

  // 数字滚动动画
  cardElements.forEach((card, index) => {
    const valueEl = card.querySelector('.value')
    const targetValue = cards[index].value
    const format = cards[index].format

    const obj = { value: 0 }
    gsap.to(obj, {
      value: targetValue,
      duration: 1.5,
      delay: 0.3 + index * 0.1,
      ease: 'power2.out',
      onUpdate: () => {
        valueEl.textContent = formatValue(obj.value, format)
      }
    })
  })
})
</script>

<template>
  <section ref="cardsRef" class="kpis">
    <div
      v-for="(card, index) in cards"
      :key="index"
      class="kpi"
      :style="{ borderTopColor: card.color }"
    >
      <div class="label">{{ card.label }}</div>
      <div class="value">0</div>
      <div class="hint">{{ card.hint }}</div>
    </div>
  </section>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-top: 20px;
  align-items: stretch;
}

.kpi {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px 18px;
  min-height: 120px;
  border-top: 3px solid;
  transition: box-shadow var(--transition), transform var(--transition);
  cursor: default;
  display: flex;
  flex-direction: column;
}

.kpi:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.label {
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
}

.value {
  margin-top: 12px;
  font-size: 28px;
  font-weight: 700;
  white-space: nowrap;
  color: var(--ink);
}

.hint {
  margin-top: auto;
  padding-top: 10px;
  color: var(--muted);
  font-size: 12px;
}
</style>
