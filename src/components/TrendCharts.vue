<script setup>
import { ref, onMounted, onUnmounted, shallowRef, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { gsap } from 'gsap'

const props = defineProps({
  monthTrend: Array,
  monthTrendZones: Array,
  calendarData: Array,
  weekTrend: Array,
  weekTrendZones: Array
})

// Refs for elements and chart instances
const monthChartRef = ref(null)
const calendarChartRef = ref(null)
const calendarScrollWrapRef = ref(null)
const weekChartRef = ref(null)

const monthChart = shallowRef(null)
const calendarChart = shallowRef(null)
const weekChart = shallowRef(null)

const containerRef = ref(null)
const trendCardRef = ref(null)
const calendarCardRef = ref(null)

// Stacked card active state: 'trend' | 'calendar'
const activeCard = ref('trend')
const isAnimating = ref(false)

// Trend Chart States
const viewMode = ref('total')
const canToggle = ref(false)
const toggleState = ref(false)
const legendData = ref([])

// Calendar Chart States
const calendarMetric = ref('count') // 'count' (按单量) | 'amount' (按金额)
// 数据中最早 / 最晚日期（从 calendarData 动态计算）
const DATA_MIN_DATE = computed(() => {
  if (!props.calendarData || !props.calendarData.length) return '2025-08-01'
  return props.calendarData[0][0]
})
const DATA_MAX_DATE = computed(() => {
  if (!props.calendarData || !props.calendarData.length) return '2026-07-31'
  return props.calendarData[props.calendarData.length - 1][0]
})
// 自定义日期区间（默认全部数据范围）
const calendarStart = ref('')
const calendarEnd   = ref('')

// 数据加载后初始化日期区间
watch(() => props.calendarData, (data) => {
  if (data && data.length && !calendarStart.value) {
    calendarStart.value = data[0][0]
    calendarEnd.value = data[data.length - 1][0]
  }
}, { immediate: true })

// Date picker range model (Vuetify range mode needs all dates in range for highlighting)
const dateMenuOpen = ref(false)
let suppressWatcher = false
function buildDateRange(start, end) {
  const dates = []
  const cur = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (cur <= last) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}
const dateRange = ref(calendarStart.value ? buildDateRange(calendarStart.value, calendarEnd.value) : [])
watch([calendarStart, calendarEnd], ([s, e]) => {
  if (suppressWatcher) return
  dateRange.value = buildDateRange(s, e)
})
function normalizeDate(v) {
  // Vuetify may return Date objects or ISO strings — always produce YYYY-MM-DD
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(v).slice(0, 10)
}
function onDateRangeUpdate(val) {
  if (val.length >= 2) {
    suppressWatcher = true
    calendarStart.value = normalizeDate(val[0])
    calendarEnd.value = normalizeDate(val[val.length - 1])
    dateMenuOpen.value = false
    nextTick(() => { suppressWatcher = false })
  }
}

// Week Chart States
const weekViewMode = ref('total')
const weekCanToggle = ref(false)
const weekToggleState = ref(false)
const weekLegendData = ref([])

let animationContext = null
let chartsMounted = false

const seedColors = [
  { main: '#3b82f6', light: '#93c5fd' },
  { main: '#10b981', light: '#6ee7b7' },
  { main: '#f59e0b', light: '#fcd34d' },
  { main: '#8b5cf6', light: '#c4b5fd' },
  { main: '#ef4444', light: '#fca5a5' },
  { main: '#06b6d4', light: '#a5f3fc' },
  { main: '#ec4899', light: '#fbcfe8' },
  { main: '#f97316', light: '#fed7aa' },
  { main: '#6366f1', light: '#a5b4fc' },
  { main: '#14b8a6', light: '#5eead4' },
  { main: '#eab308', light: '#fde047' },
  { main: '#a855f7', light: '#c084fc' }
]
const zoneColorCache = []

function fmtMoney(value) {
  return (Math.floor(value / 10000 * 100) / 100).toFixed(2) + '万'
}

function fmtActual(value) {
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function genOverflowColor(index) {
  const hue = (index * 137.508 + 30) % 360
  const lightness = 55 + (index % 3) * 5
  return {
    main: `hsl(${hue}, 65%, ${lightness}%)`,
    light: `hsl(${hue}, 75%, ${Math.min(lightness + 20, 88)}%)`
  }
}

function getZoneColor(index) {
  if (index < seedColors.length) return seedColors[index]
  const overflowIndex = index - seedColors.length
  while (zoneColorCache.length <= overflowIndex) {
    zoneColorCache.push(genOverflowColor(zoneColorCache.length + seedColors.length))
  }
  return zoneColorCache[overflowIndex]
}

function getTotalAmount(row, zones) {
  if (Number.isFinite(row.amount)) return row.amount
  return zones.reduce((sum, zone) => sum + Number(row[zone] || 0), 0)
}

// Calendar Statistics — filtered to calendarStart / calendarEnd
const filteredCalendarData = computed(() => {
  if (!props.calendarData) return []
  const s = calendarStart.value
  const e = calendarEnd.value
  if (!s || !e) return props.calendarData
  return props.calendarData.filter(item => item[0] >= s && item[0] <= e)
})

const activeDaysCount = computed(() => {
  return filteredCalendarData.value.filter(item => item[1] > 0 || item[2] > 0).length
})

const maxDayItem = computed(() => {
  if (!filteredCalendarData.value.length) return [ '', 0, 0 ]
  return filteredCalendarData.value.reduce((max, item) => item[1] > max[1] ? item : max, [ '', 0, 0 ])
})

const maxDayAmountFormatted = computed(() => {
  return fmtMoney(maxDayItem.value[1] || 0)
})

const maxDayCount = computed(() => {
  if (!filteredCalendarData.value.length) return 0
  return filteredCalendarData.value.reduce((max, item) => Math.max(max, item[2] || 0), 0)
})

const rangeTotalOrders = computed(() => {
  return filteredCalendarData.value.reduce((sum, item) => sum + (item[2] || 0), 0)
})

const rangeTotalAmount = computed(() => {
  return filteredCalendarData.value.reduce((sum, item) => sum + (item[1] || 0), 0)
})

const calendarLegendPieces = computed(() => {
  // 顺序与 visualMap pieces 一致：从大到小
  return calendarMetric.value === 'count'
    ? [
        { label: '≥30单', color: '#d97706' },
        { label: '15-29单', color: '#1d4ed8' },
        { label: '8-14单', color: '#2563eb' },
        { label: '4-7单', color: '#60a5fa' },
        { label: '1-3单', color: '#93c5fd' },
        { label: '无交易', color: '#f1f5f9' },
      ]
    : [
        { label: '≥5万', color: '#6d28d9' },
        { label: '2万-5万', color: '#7c3aed' },
        { label: '8千-2万', color: '#8b5cf6' },
        { label: '2千-8千', color: '#a78bfa' },
        { label: '<2千', color: '#ddd6fe' },
        { label: '无交易', color: '#f5f3ff' },
      ]
})

// 图例交互状态: pieceIndex → visible
const legendSelected = ref({})
function resetLegendSelected() {
  const map = {}
  calendarLegendPieces.value.forEach((_, i) => { map[i] = true })
  legendSelected.value = map
}
resetLegendSelected()

// 切换图例项并同步到 ECharts
function toggleLegendPiece(index) {
  const sel = { ...legendSelected.value }
  sel[index] = !sel[index]
  legendSelected.value = sel
  calendarChart.value?.dispatchAction({
    type: 'selectDataRange',
    selected: sel,
  })
}

// 切换维度 / 数据变化时重置图例状态
watch(calendarMetric, () => { resetLegendSelected() })

// Monthly totals for tooltip: { 'YYYY-MM': { amount, count } }
const monthlyTotals = computed(() => {
  const map = {}
  for (const item of (props.calendarData || [])) {
    const ym = item[0].slice(0, 7)
    if (!map[ym]) map[ym] = { amount: 0, count: 0 }
    map[ym].amount += item[1] || 0
    map[ym].count += item[2] || 0
  }
  return map
})

// GSAP Card Stack Swap — order follows actual stacking position
function switchCard(targetCard) {
  if (isAnimating.value || activeCard.value === targetCard) return
  isAnimating.value = true

  // Determine which card is on top and which is behind
  const isTrendFront = activeCard.value === 'trend'
  const topEl    = isTrendFront ? trendCardRef.value : calendarCardRef.value
  const behindEl = isTrendFront ? calendarCardRef.value : trendCardRef.value

  const tl = gsap.timeline({
    onComplete: () => {
      activeCard.value = targetCard
      gsap.set([topEl, behindEl], { clearProps: 'all' })
      nextTick(() => {
        monthChart.value?.resize()
        calendarChart.value?.resize()
        isAnimating.value = false
      })
    }
  })

  // 1. Top card slides away
  tl.to(topEl, {
    x: -80,
    y: 30,
    rotation: -2,
    opacity: 0,
    duration: 0.3,
    ease: 'power1.in'
  })

  // 2. Swap z-index AFTER top card has left
  tl.set(behindEl, { zIndex: 2 })

  // 3. Behind card moves into front position (1s)
  tl.to(behindEl, {
    x: 0,
    y: 0,
    opacity: 1,
    duration: 1,
    ease: 'power1.out'
  })
}

function createAxisTooltip() {
  return {
    trigger: 'axis',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    textStyle: { color: '#1a2332', fontSize: 13 },
    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(37, 99, 235, 0.06)' } },
    formatter: params => {
      let html = `<strong>${params[0].axisValue}</strong><br/>`
      params.forEach(item => {
        const value = item.seriesName === '订单金额'
          ? '¥' + fmtActual(item.value)
          : item.value + ' 单'
        html += `${item.marker} ${item.seriesName}：${value}<br/>`
      })
      return html
    }
  }
}

function createBaseXAxis(rows) {
  return {
    type: 'category',
    data: rows.map(item => item.label),
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    axisTick: { show: false },
    axisLabel: { color: '#6b7280', fontSize: 12 }
  }
}

function createTotalOption(rows, zones, barWidth) {
  return {
    tooltip: createAxisTooltip(),
    legend: {
      bottom: 4,
      left: 'center',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
      textStyle: { color: '#6b7280', fontSize: 11 },
      icon: 'roundRect'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '16%',
      containLabel: true
    },
    xAxis: createBaseXAxis(rows),
    yAxis: [
      {
        type: 'value',
        name: '金额',
        nameTextStyle: { color: '#9ca3af', fontSize: 11, padding: [0, 40, 0, 0] },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#9ca3af', fontSize: 11, formatter: fmtMoney }
      },
      {
        type: 'value',
        name: '订单数',
        nameTextStyle: { color: '#9ca3af', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 11 }
      }
    ],
    series: [
      {
        name: '订单金额',
        type: 'bar',
        data: rows.map(row => Number(getTotalAmount(row, zones).toFixed(2))),
        barWidth,
        barCategoryGap: '30%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#60a5fa' },
            { offset: 1, color: '#3b82f6' }
          ])
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#93c5fd' },
              { offset: 1, color: '#2563eb' }
            ])
          }
        }
      },
      {
        name: '订单数',
        type: 'line',
        yAxisIndex: 1,
        data: rows.map(row => row.count || 0),
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { color: '#f59e0b', width: 2.5 },
        itemStyle: { color: '#f59e0b', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.12)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0)' }
          ])
        }
      }
    ]
  }
}

function createZoneOption(rows, zones) {
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#1a2332', fontSize: 12 },
      axisPointer: { type: 'shadow' },
      formatter: params => {
        let total = 0
        let html = `<strong style="font-size:13px">${params[0].axisValue}</strong><div style="margin-top:6px">`
        params.forEach(item => {
          if (item.value <= 0) return
          total += item.value
          const color = getZoneColor(item.seriesIndex).main
          html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:6px"></span>${item.seriesName}：<strong>¥${fmtActual(item.value)}</strong><br/>`
        })
        return html + `</div><div style="border-top:1px solid #e5e7eb;margin-top:4px;padding-top:4px">合计：<strong>¥${fmtActual(total)}</strong></div>`
      }
    },
    legend: { show: false },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '16%',
      containLabel: true
    },
    xAxis: createBaseXAxis(rows),
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      axisLabel: {
        color: '#9ca3af',
        fontSize: 11,
        formatter: value => value >= 10000 ? (value / 10000).toFixed(0) + '万' : value
      }
    },
    series: zones.map((zone, index) => ({
      name: zone,
      type: 'bar',
      stack: 'total',
      barWidth: '45%',
      data: rows.map(row => row[zone] || 0),
      itemStyle: {
        color: getZoneColor(index).main,
        borderRadius: [3, 3, 0, 0]
      },
      emphasis: {
        focus: 'series',
        itemStyle: { color: getZoneColor(index).light }
      }
    }))
  }
}

function initTrendChart({
  element,
  chartState,
  mode,
  canToggleState,
  toggleStateRef,
  legends,
  rows,
  zones,
  totalBarWidth
}) {
  if (!element.value) return

  chartState.value?.dispose()
  const chart = echarts.init(element.value, null, { renderer: 'canvas' })
  const zoneNames = Array.isArray(zones) ? zones : []

  canToggleState.value = mode.value === 'zone'
  toggleStateRef.value = false
  legends.value = mode.value === 'zone'
    ? zoneNames.map((name, index) => ({
        name,
        visible: true,
        color: getZoneColor(index).main
      }))
    : []

  chart.setOption(
    mode.value === 'total'
      ? createTotalOption(rows, zoneNames, totalBarWidth)
      : createZoneOption(rows, zoneNames)
  )

  chart.on('click', params => {
    chart.dispatchAction({
      type: 'highlight',
      seriesIndex: params.seriesIndex,
      dataIndex: params.dataIndex
    })
    setTimeout(() => {
      if (chart.isDisposed()) return
      chart.dispatchAction({
        type: 'downplay',
        seriesIndex: params.seriesIndex,
        dataIndex: params.dataIndex
      })
    }, 900)
  })

  chartState.value = chart
}

function initMonthChart() {
  if (!props.monthTrend || !props.monthTrend.length) return
  initTrendChart({
    element: monthChartRef,
    chartState: monthChart,
    mode: viewMode,
    canToggleState: canToggle,
    toggleStateRef: toggleState,
    legends: legendData,
    rows: props.monthTrend,
    zones: props.monthTrendZones,
    totalBarWidth: '45%'
  })
}

function initCalendarChart() {
  if (!calendarChartRef.value) return
  if (!calendarStart.value || !calendarEnd.value) return

  calendarChart.value?.dispose()

  const start = calendarStart.value
  const end   = calendarEnd.value
  const rawData = (props.calendarData || []).filter(item => item[0] >= start && item[0] <= end)
  const allRaw = props.calendarData || []

  const isCountMode = calendarMetric.value === 'count'

  // Compute number of months to determine canvas width (min 48px per week-column ≈ 7 cells)
  const startDate = new Date(start)
  const endDate = new Date(end)
  const monthCount = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth() + 1
  // Each month ≈ 4.33 weeks; 1 cell = 14px + 2px gap → ~96px per month
  const canvasWidth = Math.max(monthCount * 96 + 60, 400)

  // Resize the container to the computed canvas width so echarts draws at full size
  calendarChartRef.value.style.width = canvasWidth + 'px'
  const chart = echarts.init(calendarChartRef.value, null, { renderer: 'canvas', width: canvasWidth, height: 360 })

  const formattedData = rawData.map(item => [
    item[0],
    isCountMode ? item[2] : item[1]
  ])

  // Build monthly total lookup for month label hover
  const monthTotals = {}
  for (const item of allRaw) {
    const ym = item[0].slice(0, 7)
    if (!monthTotals[ym]) monthTotals[ym] = { amount: 0, count: 0 }
    monthTotals[ym].amount += item[1] || 0
    monthTotals[ym].count += item[2] || 0
  }

  const option = {
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#1a2332', fontSize: 12 },
      formatter: params => {
        // Day cell hover
        if (params.componentType === 'series') {
          const d = params.data
          if (!d) return ''
          const dateStr = d[0]
          const item = allRaw.find(r => r[0] === dateStr)
          const amount = item ? item[1] : 0
          const count = item ? item[2] : 0
          const ym = dateStr.slice(0, 7)
          const mt = monthTotals[ym] || { amount: 0, count: 0 }
          const [y, m] = ym.split('-')
          const monthLabel = `${y}年${parseInt(m)}月`
          const weekDays = ['日', '一', '二', '三', '四', '五', '六']
          const dt = new Date(dateStr + 'T00:00:00')
          const weekDay = weekDays[dt.getDay()]
          return `
            <div style="font-weight:700;margin-bottom:4px;color:#1e293b;font-size:13px;">📅 ${dateStr} 周${weekDay}</div>
            <div style="color:#475569;line-height:1.7;">
              当日单量：<strong style="color:#2563eb;">${count} 单</strong><br/>
              当日金额：<strong style="color:#7c3aed;">¥${fmtActual(amount)}</strong>
            </div>
            <div style="border-top:1px solid #e5e7eb;margin-top:5px;padding-top:5px;color:#64748b;font-size:11px;">
              📊 ${monthLabel}月合计：<strong>${mt.count}单</strong> / <strong>¥${fmtActual(mt.amount)}</strong>
            </div>
          `
        }
        return ''
      }
    },
    // visualMap required by heatmap series, hidden since we render our own legend
    visualMap: {
      show: false,
      type: 'piecewise',
      pieces: isCountMode
        ? [
            { min: 30, color: '#d97706' },
            { min: 15, max: 29, color: '#1d4ed8' },
            { min: 8, max: 14, color: '#2563eb' },
            { min: 4, max: 7, color: '#60a5fa' },
            { min: 1, max: 3, color: '#93c5fd' },
            { value: 0, color: '#f1f5f9' },
          ]
        : [
            { min: 50000, color: '#6d28d9' },
            { min: 20000, max: 49999.99, color: '#7c3aed' },
            { min: 8000, max: 19999.99, color: '#8b5cf6' },
            { min: 2000, max: 7999.99, color: '#a78bfa' },
            { min: 0.01, max: 1999.99, color: '#ddd6fe' },
            { value: 0, color: '#f5f3ff' },
          ],
    },
    calendar: {
      top: 40,
      left: 40,
      right: 14,
      bottom: 12,
      range: [start, end],
      cellSize: [16, 16],
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.15)',
          width: 1,
          type: 'solid'
        }
      },
      itemStyle: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 3,
        shadowBlur: 1,
        shadowColor: 'rgba(0, 0, 0, 0.04)'
      },
      yearLabel: { show: false },
      dayLabel: {
        firstDay: 1,
        nameMap: ['日', '一', '二', '三', '四', '五', '六'],
        color: '#94a3b8',
        fontSize: 10,
        fontWeight: 500
      },
      monthLabel: {
        nameMap: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        color: '#334155',
        fontSize: 11,
        fontWeight: 600
      }
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: formattedData
      }
    ]
  }

  chart.setOption(option)
  calendarChart.value = chart

  // 默认滚到最右侧（最新数据）
  nextTick(() => {
    const wrap = calendarScrollWrapRef.value
    if (wrap) wrap.scrollLeft = wrap.scrollWidth
  })
}

function initWeekChart() {
  if (!props.weekTrend || !props.weekTrend.length) return
  initTrendChart({
    element: weekChartRef,
    chartState: weekChart,
    mode: weekViewMode,
    canToggleState: weekCanToggle,
    toggleStateRef: weekToggleState,
    legends: weekLegendData,
    rows: props.weekTrend,
    zones: props.weekTrendZones,
    totalBarWidth: '40%'
  })
}

function toggleAll(chartState, legends, state) {
  const chart = chartState.value
  if (!chart) return

  const shouldSelectAll = legends.value.some(item => !item.visible)
  legends.value.forEach(item => {
    item.visible = shouldSelectAll
    chart.dispatchAction({
      type: shouldSelectAll ? 'legendSelect' : 'legendUnSelect',
      name: item.name
    })
  })
  state.value = !shouldSelectAll
}

function toggleOne(chartState, legends, state, name) {
  const chart = chartState.value
  const item = legends.value.find(legend => legend.name === name)
  if (!chart || !item) return

  item.visible = !item.visible
  chart.dispatchAction({
    type: item.visible ? 'legendSelect' : 'legendUnSelect',
    name
  })
  state.value = legends.value.some(legend => !legend.visible)
}

function toggleLegends() {
  toggleAll(monthChart, legendData, toggleState)
}

function toggleSeries(name) {
  toggleOne(monthChart, legendData, toggleState, name)
}

function toggleWeekLegends() {
  toggleAll(weekChart, weekLegendData, weekToggleState)
}

function toggleWeekSeries(name) {
  toggleOne(weekChart, weekLegendData, weekToggleState, name)
}

function handleResize() {
  monthChart.value?.resize()
  weekChart.value?.resize()
  // Note: calendarChart uses fixed pixel width inside a scroll container — skip auto-resize
}

function reinit(callback) {
  if (!chartsMounted) return
  nextTick(callback)
}

watch(viewMode, () => reinit(initMonthChart))
watch(weekViewMode, () => reinit(initWeekChart))
watch(calendarMetric, () => reinit(initCalendarChart))
watch([calendarStart, calendarEnd], () => reinit(initCalendarChart))
watch(
  () => [props.monthTrend, props.monthTrendZones],
  () => reinit(initMonthChart),
  { deep: true }
)
watch(
  () => props.calendarData,
  () => reinit(initCalendarChart),
  { deep: true }
)
watch(
  () => [props.weekTrend, props.weekTrendZones],
  () => reinit(initWeekChart),
  { deep: true }
)

onMounted(() => {
  chartsMounted = true
  initMonthChart()
  initCalendarChart()
  initWeekChart()

  if (containerRef.value) {
    animationContext = gsap.context(() => {
      gsap.from('.stacked-card-wrapper, article.panel:not(.panel-card)', {
        y: 30,
        autoAlpha: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power2.out',
        clearProps: 'all'
      })
    }, containerRef.value)
  }

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  chartsMounted = false
  window.removeEventListener('resize', handleResize)
  animationContext?.revert()
  monthChart.value?.dispose()
  calendarChart.value?.dispose()
  weekChart.value?.dispose()
})
</script>

<template>
  <div ref="containerRef" class="trend-charts">
    <!-- 堆叠卡片区域（近半年订单趋势 + 订单日历） -->
    <div class="stacked-card-wrapper">
      <!-- 堆叠卡片 1：近半年订单趋势 -->
      <article
        ref="trendCardRef"
        class="panel panel-card"
        :class="activeCard === 'trend' ? 'is-front' : 'is-back'"
        @click="activeCard !== 'trend' && switchCard('trend')"
      >
        <div class="panel-head">
          <h2>近半年订单趋势</h2>
          <div class="head-right">
            <button
              v-if="canToggle && activeCard === 'trend'"
              class="toggle-btn"
              @click.stop="toggleLegends"
            >{{ toggleState ? '全选' : '取消全选' }}</button>
            <div class="seg">
              <button
                :class="{ active: viewMode === 'total' }"
                @click.stop="viewMode = 'total'"
              >按总额</button>
              <button
                :class="{ active: viewMode === 'zone' }"
                @click.stop="viewMode = 'zone'"
              >按专区</button>
            </div>
            <!-- 卡片切换控制 -->
            <div class="card-tab-switcher">
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'trend' }"
                @click.stop="switchCard('trend')"
              >📈 趋势</button>
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'calendar' }"
                @click.stop="switchCard('calendar')"
              >📅 日历</button>
            </div>
          </div>
        </div>

        <div ref="monthChartRef" :class="viewMode === 'total' ? 'total-chart' : 'zone-chart'"></div>

        <div v-if="viewMode === 'zone'" class="custom-legend">
          <div
            v-for="(zone, index) in legendData"
            :key="zone.name"
            class="legend-item"
            :class="{ inactive: !zone.visible }"
            @click.stop="toggleSeries(zone.name)"
          >
            <span class="legend-icon" :style="{ background: zone.visible ? getZoneColor(index).main : '#d1d5db' }"></span>
            <span class="legend-text">{{ zone.name }}</span>
          </div>
        </div>
      </article>

      <!-- 堆叠卡片 2：订单日历（全量历史数据热力图） -->
      <article
        ref="calendarCardRef"
        class="panel panel-card"
        :class="activeCard === 'calendar' ? 'is-front' : 'is-back'"
        @click="activeCard !== 'calendar' && switchCard('calendar')"
      >
        <div class="panel-head">
          <h2>订单日历</h2>
          <div class="head-right">
            <!-- 日期区间选择器 -->
            <v-menu
              v-model="dateMenuOpen"
              :close-on-content-click="false"
              location="bottom"
            >
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  variant="outlined"
                  density="compact"
                  prepend-icon="mdi-calendar-range"
                  class="date-trigger-btn"
                >
                  {{ calendarStart }} — {{ calendarEnd }}
                </v-btn>
              </template>
              <v-date-picker
                v-model="dateRange"
                multiple="range"
                :min="DATA_MIN_DATE"
                :max="DATA_MAX_DATE"
                show-adjacent-months
                color="primary"
                locale="zh-CN"
                hide-header
                @update:model-value="onDateRangeUpdate"
              />
            </v-menu>

            <!-- 单量 / 金额 维度切换 -->
            <div class="seg">
              <button
                :class="{ active: calendarMetric === 'count' }"
                @click.stop="calendarMetric = 'count'"
              >按单量</button>
              <button
                :class="{ active: calendarMetric === 'amount' }"
                @click.stop="calendarMetric = 'amount'"
              >按金额</button>
            </div>

            <!-- 卡片切换控制 -->
            <div class="card-tab-switcher">
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'trend' }"
                @click.stop="switchCard('trend')"
              >📈 趋势</button>
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'calendar' }"
                @click.stop="switchCard('calendar')"
              >📅 日历</button>
            </div>
          </div>
        </div>

        <!-- 横向可滚动包裹层 -->
        <div ref="calendarScrollWrapRef" class="calendar-scroll-wrap">
          <div ref="calendarChartRef" class="calendar-chart-inner"></div>
        </div>

        <!-- 自定义图例（可交互） -->
        <div class="calendar-legend">
          <span
            v-for="(piece, idx) in calendarLegendPieces"
            :key="piece.label"
            class="legend-item"
            :class="{ inactive: !legendSelected[idx] }"
            @click="toggleLegendPiece(idx)"
          >
            <span class="legend-dot" :style="{ background: piece.color }"></span>
            <span class="legend-text">{{ piece.label }}</span>
          </span>
        </div>

        <div class="calendar-footer-summary">
          <div class="summary-chip">
            <span class="chip-label">📦 区间订单数</span>
            <span class="chip-val">{{ rangeTotalOrders }} 单</span>
          </div>
          <div class="summary-chip">
            <span class="chip-label">💰 区间总金额</span>
            <span class="chip-val">¥{{ fmtActual(rangeTotalAmount) }}</span>
          </div>
        </div>
      </article>
    </div>

    <!-- 近7天订单趋势 (保持原本布局不变) -->
    <article class="panel">
      <div class="panel-head">
        <h2>近7天订单趋势</h2>
        <div class="head-right">
          <button
            v-if="weekCanToggle"
            class="toggle-btn"
            @click="toggleWeekLegends"
          >{{ weekToggleState ? '全选' : '取消全选' }}</button>
          <div class="seg">
            <button
              :class="{ active: weekViewMode === 'total' }"
              @click="weekViewMode = 'total'"
            >按总额</button>
            <button
              :class="{ active: weekViewMode === 'zone' }"
              @click="weekViewMode = 'zone'"
            >按专区</button>
          </div>
        </div>
      </div>
      <div ref="weekChartRef" :class="weekViewMode === 'total' ? 'total-chart' : 'zone-chart'"></div>
      <div v-if="weekViewMode === 'zone'" class="custom-legend">
        <div
          v-for="(zone, index) in weekLegendData"
          :key="zone.name"
          class="legend-item"
          :class="{ inactive: !zone.visible }"
          @click="toggleWeekSeries(zone.name)"
        >
          <span class="legend-icon" :style="{ background: zone.visible ? getZoneColor(index).main : '#d1d5db' }"></span>
          <span class="legend-text">{{ zone.name }}</span>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.trend-charts {
  display: grid;
  gap: 16px;
}

/* 堆叠卡片容器: 尺寸严格保持与单卡片一致，禁止溢出外部 boundaries */
.stacked-card-wrapper {
  position: relative;
  width: 100%;
  height: 535px;
}

/* 堆叠面板卡片: 宽度/高度计算偏移，使总投影面积精准等于父容器(100% * 100%) */
.panel-card {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% - 14px);
  height: calc(100% - 12px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: var(--panel, rgba(255, 255, 255, 0.95));
  border: 1px solid var(--panel-border, var(--line, #e2e8f0));
  border-radius: var(--radius, 10px);
  padding: 16px 18px;
  overflow: hidden;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}

/* 置顶顶层卡片 */
.panel-card.is-front {
  top: 0;
  left: 0;
  transform: translate(0, 0);
  z-index: 2;
  opacity: 1;
  box-shadow: 0 10px 28px rgba(26, 35, 50, 0.12), 0 2px 6px rgba(37, 99, 235, 0.08);
}

/* 置底底层卡片: 偏移 (14px, 12px)，露右侧和下侧边缘，营造沉浸式堆叠立体感 */
.panel-card.is-back {
  top: 0;
  left: 0;
  transform: translate(14px, 12px);
  z-index: 1;
  opacity: 0.92;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(26, 35, 50, 0.08);
  border-color: rgba(37, 99, 235, 0.35);
  background: var(--panel, rgba(255, 255, 255, 0.92));
}

.panel-card.is-back .panel-head,
.panel-card.is-back .total-chart,
.panel-card.is-back .zone-chart,
.panel-card.is-back .calendar-chart,
.panel-card.is-back .custom-legend,
.panel-card.is-back .calendar-footer-summary {
  pointer-events: none;
}

.panel-card.is-back:hover {
  opacity: 0.98;
  border-color: #3b82f6;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.18);
}

.panel-card.is-back:hover .panel-head,
.panel-card.is-back:hover .total-chart,
.panel-card.is-back:hover .calendar-chart {
  opacity: 0.45;
}



/* 卡片切换 Tab */
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
  padding: 4px 10px;
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


/* 日期选择触发按钮 */
.date-trigger-btn {
  font-size: 13px !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 500 !important;
  color: #475569 !important;
  border-color: #e2e8f0 !important;
  background: #f8fafc !important;
  height: 32px !important;
  padding: 0 14px !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

.date-trigger-btn:hover {
  border-color: #667eea !important;
  color: #667eea !important;
  background: #f0f4ff !important;
}

/* 图表容器尺寸 */
.total-chart {
  width: 100%;
  height: 420px;
}

.zone-chart {
  width: 100%;
  height: 380px;
}

/* 日历横向可滚动容器 */
.calendar-scroll-wrap {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  margin: 0 -4px;
  padding: 0 4px;
  /* 细滚动条 */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.calendar-scroll-wrap::-webkit-scrollbar {
  height: 4px;
}

.calendar-scroll-wrap::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

/* ECharts 日历画布 — 宽度由 JS 动态计算写入 style */
.calendar-chart-inner {
  height: 360px;
  /* min-width 防止宽度小于父容器时 ECharts 压缩 */
  min-width: 400px;
  display: block;
}


/* 日历底部摘要 */
.calendar-footer-summary {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px 12px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-top: 4px;
}

/* 自定义图例 */
.calendar-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 0;
  width: 50%;
  margin: 0 auto;
}

.calendar-legend .legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.calendar-legend .legend-item.inactive {
  opacity: 0.3;
}

.calendar-legend .legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.calendar-legend .legend-text {
  font-size: 10px;
  color: #64748b;
  white-space: nowrap;
}

.summary-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.chip-label {
  color: #64748b;
}

.chip-val {
  font-weight: 700;
  color: #1e293b;
}

/* 底部底层卡片提示 */
/* 普通 Panel 基础样式 */
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
}

.panel-head h2 {
  font-size: 18px;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-btn {
  border: 1px solid #ef4444;
  background: transparent;
  color: #ef4444;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
}

.toggle-btn:hover {
  background: #fef2f2;
}

.custom-legend {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 6px 0;
  height: 80px;
  overflow-y: auto;
  padding: 4px;
  flex-shrink: 0;
  border-top: 1px solid var(--line, #e2e8f0);
  margin-top: 6px;
}

.custom-legend::-webkit-scrollbar {
  width: 4px;
}

.custom-legend::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 25%;
  padding: 3px 6px;
  cursor: pointer;
  transition: opacity 0.2s;
  box-sizing: border-box;
}

.legend-item.inactive {
  opacity: 0.4;
}

.legend-icon {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-text {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Vuetify Date Picker 样式优化 */
:deep(.v-date-picker) {
  border-radius: 12px !important;
  overflow: hidden;
}

:deep(.v-date-picker-controls) {
  flex-direction: row-reverse !important;
}

:deep(.v-date-picker-controls .v-date-picker-header__text) {
  flex-direction: row-reverse !important;
}

:deep(.v-date-picker-table) {
  padding: 4px 8px 8px !important;
}

:deep(.v-date-picker-table th) {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #64748b !important;
  padding: 8px 0 !important;
}

:deep(.v-date-picker-table .v-btn) {
  border-radius: 8px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

:deep(.v-date-picker-table .v-btn--variant-flat) {
  background: transparent !important;
}

:deep(.v-date-picker-table .v-btn--active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4) !important;
}

:deep(.v-date-picker-table .v-btn:hover:not(.v-btn--active)) {
  background: rgba(102, 126, 234, 0.08) !important;
  color: #667eea !important;
}

:deep(.v-date-picker-years) {
  padding: 8px !important;
}

:deep(.v-date-picker-years .v-btn) {
  border-radius: 8px !important;
  font-size: 14px !important;
}
</style>
