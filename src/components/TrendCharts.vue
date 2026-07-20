<script setup>
import { ref, onMounted, onUnmounted, shallowRef, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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
const viewMode = ref('total') // 'total' | 'zone'
const canToggle = ref(false)
const toggleState = ref(false) // false = 全选状态, true = 有取消状态
const legendData = ref([])
const weekViewMode = ref('total') // 'total' | 'zone'
const weekCanToggle = ref(false)
const weekToggleState = ref(false)
const weekLegendData = ref([])

// 金额格式化：万为单位，2位小数，截断不四舍五入（用于KPI大数字）
function fmtMoney(n) {
  return (Math.floor(n / 10000 * 100) / 100).toFixed(2) + '万'
}

// 金额格式化：显示实际值，带千分位（用于图表tooltip）
function fmtActual(n) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 专区颜色 - 柔和专业的配色
const zoneColors = [
  { main: '#3b82f6', light: '#93c5fd' },
  { main: '#14b8a6', light: '#5eead4' },
  { main: '#f59e0b', light: '#fcd34d' },
  { main: '#8b5cf6', light: '#c4b5fd' },
  { main: '#ef4444', light: '#fca5a5' },
  { main: '#f97316', light: '#fed7aa' },
  { main: '#06b6d4', light: '#a5f3fc' },
  { main: '#84cc16', light: '#d9f99d' },
  { main: '#ec4899', light: '#fbcfe8' },
  { main: '#6366f1', light: '#a5b4fc' }
]

function initMonthChart() {
  if (!monthChartRef.value) return
  if (monthChart.value) monthChart.value.dispose()

  const chart = echarts.init(monthChartRef.value, null, { renderer: 'canvas' })

  // 动态提取所有有订单的专区
  const zones = [...new Set(props.monthTrend.flatMap(m =>
    Object.keys(m).filter(k => k !== 'label' && k !== 'count' && m[k] > 0)
  ))]

  canToggle.value = viewMode.value === 'zone'
  toggleState.value = false
  legendData.value = []

  if (viewMode.value === 'total') {
    // 简单柱状图模式
    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1a2332', fontSize: 13 },
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(37, 99, 235, 0.06)' } },
        formatter: params => {
          let html = `<strong>${params[0].axisValue}</strong><br/>`
          params.forEach(p => {
            const val = p.seriesName === '订单金额'
              ? '¥' + fmtActual(p.value)
              : p.value + ' 单'
            html += `${p.marker} ${p.seriesName}：${val}<br/>`
          })
          return html
        }
      },
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
      xAxis: {
        type: 'category',
        data: props.monthTrend.map(x => x.label),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 12 }
      },
      yAxis: [
        {
          type: 'value',
          name: '金额',
          nameTextStyle: { color: '#9ca3af', fontSize: 11, padding: [0, 40, 0, 0] },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
          axisLabel: {
            color: '#9ca3af',
            fontSize: 11,
            formatter: v => {
              return fmtMoney(v)
            }
          }
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
          data: props.monthTrend.map(x => {
            const total = zones.reduce((sum, zone) => sum + (x[zone] || 0), 0)
            return Number(total.toFixed(2))
          }),
          barWidth: '45%',
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
          data: props.monthTrend.map(x => x.count || 0),
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
    chart.setOption(option)
  } else {
    // 叠加柱状图模式
    const series = zones.map((zone, index) => ({
      name: zone,
      type: 'bar',
      stack: 'total',
      barWidth: '45%',
      data: props.monthTrend.map(x => x[zone] || 0),
      itemStyle: {
        color: zoneColors[index % zoneColors.length].main,
        borderRadius: [3, 3, 0, 0]
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          color: zoneColors[index % zoneColors.length].light
        }
      }
    }))

    const option = {
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
          params.forEach(p => {
            if (p.value > 0) {
              total += p.value
              const val = fmtActual(p.value)
              html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${zoneColors[p.seriesIndex % zoneColors.length].main};margin-right:6px"></span>${p.seriesName}：<strong>¥${val}</strong><br/>`
            }
          })
          html += `</div><div style="border-top:1px solid #e5e7eb;margin-top:4px;padding-top:4px">合计：<strong>¥${fmtActual(total)}</strong></div>`
          return html
        }
      },
      legend: {
        show: false
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '18%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: props.monthTrend.map(x => x.label),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 12 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
        axisLabel: {
          color: '#9ca3af',
          fontSize: 11,
          formatter: v => {
            if (v >= 10000) return (v / 10000).toFixed(0) + '万'
            return v
          }
        }
      },
      series
    }
    chart.setOption(option)

    // 更新自定义图例数据
    legendData.value = zones.map((zone, index) => ({
      name: zone,
      visible: true,
      color: zoneColors[index % zoneColors.length].main
    }))
  }

  chart.on('click', params => {
    chart.dispatchAction({
      type: 'highlight',
      seriesIndex: params.seriesIndex,
      dataIndex: params.dataIndex
    })
    setTimeout(() => {
      chart.dispatchAction({
        type: 'downplay',
        seriesIndex: params.seriesIndex,
        dataIndex: params.dataIndex
      })
    }, 900)
  })

  monthChart.value = chart
}

function toggleLegends() {
  const chart = monthChart.value
  if (!chart) return

  if (!toggleState.value) {
    legendData.value.forEach(item => {
      item.visible = false
      chart.dispatchAction({ type: 'legendUnSelect', name: item.name })
    })
    toggleState.value = true
  } else {
    legendData.value.forEach(item => {
      item.visible = true
    })
    chart.dispatchAction({ type: 'legendAllSelect' })
    toggleState.value = false
  }
}

function toggleSeries(name) {
  const chart = monthChart.value
  if (!chart) return

  const item = legendData.value.find(z => z.name === name)
  if (!item) return

  item.visible = !item.visible
  chart.dispatchAction({
    type: item.visible ? 'legendSelect' : 'legendUnSelect',
    name
  })
}

function toggleWeekLegends() {
  const chart = weekChart.value
  if (!chart) return

  if (!weekToggleState.value) {
    weekLegendData.value.forEach(item => {
      item.visible = false
      chart.dispatchAction({ type: 'legendUnSelect', name: item.name })
    })
    weekToggleState.value = true
  } else {
    weekLegendData.value.forEach(item => {
      item.visible = true
    })
    chart.dispatchAction({ type: 'legendAllSelect' })
    weekToggleState.value = false
  }
}

function toggleWeekSeries(name) {
  const chart = weekChart.value
  if (!chart) return

  const item = weekLegendData.value.find(z => z.name === name)
  if (!item) return

  item.visible = !item.visible
  chart.dispatchAction({
    type: item.visible ? 'legendSelect' : 'legendUnSelect',
    name
  })
}

function initWeekChart() {
  if (!weekChartRef.value) return
  if (weekChart.value) weekChart.value.dispose()

  const chart = echarts.init(weekChartRef.value, null, { renderer: 'canvas' })

  // 动态提取所有有订单的专区
  const zones = [...new Set(props.weekTrend.flatMap(m =>
    Object.keys(m).filter(k => k !== 'label' && k !== 'count' && k !== 'amount' && m[k] > 0)
  ))]

  weekCanToggle.value = weekViewMode.value === 'zone'
  weekToggleState.value = false
  weekLegendData.value = []

  if (weekViewMode.value === 'total') {
    // 简单柱状图模式
    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1a2332', fontSize: 13 },
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(37, 99, 235, 0.06)' } },
        formatter: params => {
          let html = `<strong>${params[0].axisValue}</strong><br/>`
          params.forEach(p => {
            const val = p.seriesName === '订单金额'
              ? '¥' + fmtActual(p.value)
              : p.value + ' 单'
            html += `${p.marker} ${p.seriesName}：${val}<br/>`
          })
          return html
        }
      },
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
      xAxis: {
        type: 'category',
        data: props.weekTrend.map(x => x.label),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 12 }
      },
      yAxis: [
        {
          type: 'value',
          name: '金额',
          nameTextStyle: { color: '#9ca3af', fontSize: 11, padding: [0, 40, 0, 0] },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
          axisLabel: {
            color: '#9ca3af',
            fontSize: 11,
            formatter: v => {
              return fmtMoney(v)
            }
          }
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
          data: props.weekTrend.map(x => Number(x.amount.toFixed(2))),
          barWidth: '40%',
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
          data: props.weekTrend.map(x => x.count),
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
    chart.setOption(option)
  } else {
    // 叠加柱状图模式
    const series = zones.map((zone, index) => ({
      name: zone,
      type: 'bar',
      stack: 'total',
      barWidth: '45%',
      data: props.weekTrend.map(x => x[zone] || 0),
      itemStyle: {
        color: zoneColors[index % zoneColors.length].main,
        borderRadius: [3, 3, 0, 0]
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          color: zoneColors[index % zoneColors.length].light
        }
      }
    }))

    const option = {
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
          params.forEach(p => {
            if (p.value > 0) {
              total += p.value
              const val = fmtActual(p.value)
              html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${zoneColors[p.seriesIndex % zoneColors.length].main};margin-right:6px"></span>${p.seriesName}：<strong>¥${val}</strong><br/>`
            }
          })
          html += `</div><div style="border-top:1px solid #e5e7eb;margin-top:4px;padding-top:4px">合计：<strong>¥${fmtActual(total)}</strong></div>`
          return html
        }
      },
      legend: {
        show: false
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '18%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: props.weekTrend.map(x => x.label),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 12 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
        axisLabel: {
          color: '#9ca3af',
          fontSize: 11,
          formatter: v => {
            if (v >= 10000) return (v / 10000).toFixed(0) + '万'
            return v
          }
        }
      },
      series
    }
    chart.setOption(option)

    // 更新自定义图例数据
    weekLegendData.value = zones.map((zone, index) => ({
      name: zone,
      visible: true,
      color: zoneColors[index % zoneColors.length].main
    }))
  }

  chart.on('click', params => {
    chart.dispatchAction({
      type: 'highlight',
      seriesIndex: params.seriesIndex,
      dataIndex: params.dataIndex
    })
    setTimeout(() => {
      chart.dispatchAction({
        type: 'downplay',
        seriesIndex: params.seriesIndex,
        dataIndex: params.dataIndex
      })
    }, 900)
  })

  weekChart.value = chart
}

watch(viewMode, () => {
  nextTick(() => {
    initMonthChart()
  })
})

watch(weekViewMode, () => {
  nextTick(() => {
    initWeekChart()
  })
})

onMounted(() => {
  initMonthChart()
  initWeekChart()

  // 滚动触发动画
  if (containerRef.value) {
    gsap.from(containerRef.value.querySelectorAll('.panel'), {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power2.out',
      clearProps: 'all'
    })
  }

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  monthChart.value?.dispose()
  weekChart.value?.dispose()
  ScrollTrigger.getAll().forEach(t => t.kill())
})

function handleResize() {
  monthChart.value?.resize()
  weekChart.value?.resize()
}

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
          <span class="legend-icon" :style="{ background: zone.visible ? zoneColors[index % zoneColors.length].main : '#d1d5db' }"></span>
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
          <span class="legend-icon" :style="{ background: zone.visible ? zoneColors[index % zoneColors.length].main : '#d1d5db' }"></span>
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

.panel {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.seg {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255,255,255,.7);
  gap: 2px;
}

.seg button {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.seg button:hover {
  color: var(--ink);
}

.seg button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--red), var(--gold));
  box-shadow: 0 6px 15px rgba(215,25,32,.18);
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
