<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  kpis: Object
})

const cardsRef = ref(null)
let animationContext = null

const momRate = computed(() => props.kpis.momRate)
const momLabel = computed(() => momRate.value === null || momRate.value === undefined
  ? '上月无数据'
  : (momRate.value >= 0 ? `↑ ${momRate.value}%` : `↓ ${Math.abs(momRate.value)}%`))
const momColor = computed(() => momRate.value === null || momRate.value === undefined
  ? '#9ca3af'
  : (momRate.value >= 0 ? '#16a34a' : '#e11d48'))

const cards = computed(() => [
  {
    label: '总交易金额',
    value: props.kpis.totalAmount || 0,
    format: 'money',
    hint: `累计 ${formatExact(props.kpis.totalAmount || 0)}`,
    color: '#2563eb'
  },
  {
    label: '月交易金额',
    value: props.kpis.curMonthAmount || 0,
    format: 'money',
    hint: `本月 ${formatExact(props.kpis.curMonthAmount || 0)}`,
    color: '#c2410c'
  },
  {
    label: '本周交易金额',
    value: props.kpis.weekAmount || 0,
    format: 'money',
    hint: `本周 ${formatExact(props.kpis.weekAmount || 0)}`,
    color: '#0d9488'
  },
  {
    label: '今日交易金额',
    value: props.kpis.todayAmount || 0,
    format: 'money',
    hint: `今日 ${formatExact(props.kpis.todayAmount || 0)}`,
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
    hint: `上月同期 ${formatExact(props.kpis.prevMonthAmount || 0)}`,
    color: momColor.value
  },
  {
    label: '总订单数',
    value: props.kpis.totalOrders || 0,
    format: 'number',
    hint: '总计订单笔数',
    color: '#2563eb'
  },
  {
    label: '月订单数',
    value: props.kpis.curMonthOrders || 0,
    format: 'number',
    hint: '本月累计笔数',
    color: '#c2410c'
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
])

function formatValue(value, format) {
  if (format === 'money') {
    if (value >= 10000) return '¥' + (Math.floor(value / 10000 * 100) / 100).toFixed(2) + '万'
    return '¥' + Math.floor(value).toLocaleString('zh-CN')
  }
  if (format === 'mom') return momLabel.value
  return Math.round(value).toLocaleString('zh-CN')
}

function formatExact(value) {
  return '¥' + value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(() => {
  if (!cardsRef.value) return

  // 卡片入场动画
  animationContext = gsap.context(() => {
    const cardElements = cardsRef.value.querySelectorAll('.kpi')
    gsap.from(cardElements, {
      y: 30,
      autoAlpha: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power2.out',
      clearProps: 'transform,opacity,visibility'
    })

    // 数字滚动动画（mom格式直接显示）
    cardElements.forEach((card, index) => {
      const valueEl = card.querySelector('.value')
      const cardData = cards.value[index]

      if (cardData.format === 'mom') return

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
  }, cardsRef.value)
})

onUnmounted(() => animationContext?.revert())
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
      <div class="value" :style="card.format === 'mom' ? { color: momColor } : null">
        {{ formatValue(card.value, card.format) }}
      </div>
      <div class="hint">{{ card.hint }}</div>
    </div>
  </section>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
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
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 1;
}
</style>
