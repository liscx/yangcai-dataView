<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  orders: { type: Array, default: () => [] }
})

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth())

const monthLabel = computed(() =>
  `${currentYear.value}年${currentMonth.value + 1}月`
)

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // 周一=0, 周日=6
  let startWeekday = firstDay.getDay() - 1
  if (startWeekday < 0) startWeekday = 6

  const days = []

  // 上月补位
  const prevMonthLast = new Date(year, month, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLast - i,
      current: false,
      date: null,
      orders: 0,
      amount: 0
    })
  }

  // 本月
  const orderMap = {}
  props.orders.forEach(o => {
    orderMap[o.date] = o
  })

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const data = orderMap[dateStr]
    days.push({
      day: d,
      current: true,
      date: dateStr,
      orders: data?.orders || 0,
      amount: data?.amount || 0,
      isToday: dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    })
  }

  // 下月补位至满6行
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      current: false,
      date: null,
      orders: 0,
      amount: 0
    })
  }

  return days
})

function getHeatLevel(orders) {
  if (orders <= 0) return 0
  if (orders <= 5) return 1
  if (orders <= 15) return 2
  if (orders <= 30) return 3
  return 4
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function fmtAmount(value) {
  if (!value) return ''
  return '¥' + (value / 10000).toFixed(1) + '万'
}
</script>

<template>
  <div class="order-calendar">
    <div class="cal-header">
      <button class="cal-nav" @click="prevMonth">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="cal-month">{{ monthLabel }}</span>
      <button class="cal-nav" @click="nextMonth">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>

    <div class="cal-grid">
      <div v-for="w in weekDays" :key="w" class="cal-weekday">{{ w }}</div>
      <div
        v-for="(cell, i) in calendarDays"
        :key="i"
        class="cal-cell"
        :class="{
          'other-month': !cell.current,
          'is-today': cell.isToday,
          [`heat-${getHeatLevel(cell.orders)}`]: cell.current
        }"
      >
        <span class="cal-day">{{ cell.day }}</span>
        <span v-if="cell.orders > 0" class="cal-count">{{ cell.orders }}单</span>
      </div>
    </div>

    <div class="cal-legend">
      <span class="legend-label">少</span>
      <span class="legend-block heat-0"></span>
      <span class="legend-block heat-1"></span>
      <span class="legend-block heat-2"></span>
      <span class="legend-block heat-3"></span>
      <span class="legend-block heat-4"></span>
      <span class="legend-label">多</span>
    </div>
  </div>
</template>

<style scoped>
.order-calendar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 18px 18px;
  box-sizing: border-box;
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.cal-month {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  min-width: 100px;
  text-align: center;
}

.cal-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
}

.cal-nav:hover {
  color: var(--ink);
  border-color: #667eea;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  flex: 1;
}

.cal-weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  padding: 4px 0;
}

.cal-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 2px;
  border-radius: 6px;
  transition: background 0.2s;
  cursor: default;
}

.cal-cell.other-month {
  opacity: 0.25;
}

.cal-cell.is-today {
  outline: 2px solid #667eea;
  outline-offset: -2px;
}

.cal-day {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.cal-count {
  font-size: 10px;
  color: var(--muted);
  line-height: 1;
}

/* 热力图色阶 */
.heat-0 { background: rgba(226, 232, 240, 0.3); }
.heat-1 { background: rgba(165, 180, 252, 0.25); }
.heat-2 { background: rgba(129, 140, 248, 0.35); }
.heat-3 { background: rgba(99, 102, 241, 0.45); }
.heat-4 { background: rgba(67, 56, 202, 0.55); }

.heat-1 .cal-day { color: #4338ca; }
.heat-2 .cal-day { color: #3730a3; }
.heat-3 .cal-day { color: #fff; }
.heat-4 .cal-day { color: #fff; }
.heat-3 .cal-count { color: rgba(255, 255, 255, 0.8); }
.heat-4 .cal-count { color: rgba(255, 255, 255, 0.8); }

.cal-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding-top: 4px;
}

.legend-label {
  font-size: 11px;
  color: var(--muted);
}

.legend-block {
  width: 14px;
  height: 14px;
  border-radius: 3px;
}
</style>
