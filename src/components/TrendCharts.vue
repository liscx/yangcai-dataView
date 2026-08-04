<script setup>
import { ref, onMounted, onUnmounted, shallowRef, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { gsap } from 'gsap'

const props = defineProps({
  monthTrend: Array,
  monthTrendZones: Array,
  weekTrend: Array,
  weekTrendZones: Array
})

const monthChartRef = ref(null)
const weekChartRef = ref(null)
const monthChart = shallowRef(null)
const weekChart = shallowRef(null)
const containerRef = ref(null)

const viewMode = ref('total')
const canToggle = ref(false)
const toggleState = ref(false)
const legendData = ref([])

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
      bottom: 8,
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
      top: '18%',
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
      top: '18%',
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

function initWeekChart() {
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
}

function reinit(callback) {
  if (!chartsMounted) return
  nextTick(callback)
}

watch(viewMode, () => reinit(initMonthChart))
watch(weekViewMode, () => reinit(initWeekChart))
watch(
  () => [props.monthTrend, props.monthTrendZones],
  () => reinit(initMonthChart),
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
  initWeekChart()

  if (containerRef.value) {
    animationContext = gsap.context(() => {
      gsap.from('.panel', {
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
  weekChart.value?.dispose()
})
</script>

<template>
  <div ref="containerRef" class="trend-charts">
    <article class="panel">
      <div class="panel-head">
        <h2>近半年订单趋势</h2>
        <div class="head-right">
          <button
            v-if="canToggle"
            class="toggle-btn"
            @click="toggleLegends"
          >{{ toggleState ? '全选' : '取消全选' }}</button>
          <div class="seg">
            <button
              :class="{ active: viewMode === 'total' }"
              @click="viewMode = 'total'"
            >按总额</button>
            <button
              :class="{ active: viewMode === 'zone' }"
              @click="viewMode = 'zone'"
            >按专区</button>
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
          @click="toggleSeries(zone.name)"
        >
          <span class="legend-icon" :style="{ background: zone.visible ? getZoneColor(index).main : '#d1d5db' }"></span>
          <span class="legend-text">{{ zone.name }}</span>
        </div>
      </div>
    </article>
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
.panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-head {
  align-items: center;
}

.seg {
  gap: 2px;
}

.seg button {
  padding: 5px 12px;
}

.trend-charts {
  display: grid;
  gap: 16px;
}









.head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-btn {
  border: 1px solid #ef4444;
  background: transparent;
  color: #ef4444;
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
}

.toggle-btn:hover {
  background: #fef2f2;
}

.total-chart {
  width: 100%;
  min-height: 400px;
}

.zone-chart {
  width: 100%;
  min-height: 320px;
}

.custom-legend {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px 0;
  height: 90px;
  overflow-y: auto;
  padding: 4px;
  flex-shrink: 0;
  border-top: 1px solid var(--line);
  margin-top: 8px;
}

.custom-legend::-webkit-scrollbar {
  width: 4px;
}

.custom-legend::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.custom-legend::-webkit-scrollbar-track {
  background: transparent;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 25%;
  padding: 4px 8px;
  cursor: pointer;
  transition: opacity 0.2s;
  box-sizing: border-box;
}

.legend-item.inactive {
  opacity: 0.4;
}

.legend-icon {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-text {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
