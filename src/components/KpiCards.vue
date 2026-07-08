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

const momRate = props.kpis.momRate
const momLabel = momRate === null || momRate === undefined
  ? '上月无数据'
  : (momRate >= 0 ? `↑ ${momRate}%` : `↓ ${Math.abs(momRate)}%`)
const momColor = momRate === null || momRate === undefined
  ? '#9ca3af'
  : (momRate >= 0 ? '#16a34a' : '#e11d48')

const cards = [
  {
    label: '总交易金额',
    value: props.kpis.totalAmount || 0,
    format: 'money',
    hint: '累计总金额',
    color: '#2563eb'
  },
  {
    label: '本周交易金额',
    value: props.kpis.weekAmount || 0,
    format: 'money',
    hint: `本周 ${props.kpis.weekOrders || 0} 笔`,
    color: '#0d9488'
  },
  {
    label: '今日交易金额',
    value: props.kpis.todayAmount || 0,
    format: 'money',
    hint: `今日 ${props.kpis.todayOrders || 0} 笔`,
    color: '#b7791f'
  },
  {
    label: '采购企业数',
    value: props.kpis.buyerCount || 0,
    format: 'number',
    hint: '产生订单的企业数量',
    color: '#7c3aed'
  },
  {
    label: '月环比同期',
    value: 0,
    format: 'mom',
    hint: `本月 ¥${((props.kpis.curMonthAmount || 0) / 10000).toFixed(1)}万 vs 上月同期 ¥${((props.kpis.prevMonthAmount || 0) / 10000).toFixed(1)}万`,
    color: momRate >= 0 ? '#16a34a' : '#e11d48'
  },
  {
    label: '总订单数',
    value: props.kpis.totalOrders || 0,
    format: 'number',
    hint: `笔均 ¥${Math.round(props.kpis.avgAmount || 0).toLocaleString('zh-CN')}`,
    color: '#2563eb'
  },
  {
    label: '本周订单数',
    value: props.kpis.weekOrders || 0,
    format: 'number',
    hint: '本周累计笔数',
    color: '#0d9488'
  },
  {
    label: '今日订单数',
    value: props.kpis.todayOrders || 0,
    format: 'number',
    hint: '今日订单笔数',
    color: '#b7791f'
  },
  {
    label: '供应商数',
    value: props.kpis.supplierCount || 0,
    format: 'number',
    hint: '产生订单的供应商数量',
    color: '#7c3aed'
  },
  {
    label: '笔均金额',
    value: props.kpis.avgAmount || 0,
    format: 'money',
    hint: '每笔订单均值',
    color: '#e11d48'
  }
]

function formatValue(value, format) {
  if (format === 'money') {
    if (value >= 10000) return '¥' + (value / 10000).toFixed(1) + '万'
    return '¥' + Math.round(value).toLocaleString('zh-CN')
  }
  if (format === 'mom') return momLabel
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

  // 数字滚动动画（mom格式跳过数字滚动，直接显示）
  cardElements.forEach((card, index) => {
    const valueEl = card.querySelector('.value')
    const targetValue = cards[index].value
    const format = cards[index].format

    if (format === 'mom') {
      valueEl.textContent = momLabel
      valueEl.style.color = momColor
      return
    }

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
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 0;
  align-items: stretch;
}

.kpi {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 8px 10px;
  border-top: 2px solid;
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
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.7;
}
</style>
