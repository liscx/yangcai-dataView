<script setup>
import { ref, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const props = defineProps({
  monthTrend: Array,
  monthTrendZones: Array,
  weekTrend: Array
})

const monthChartRef = ref(null)
const weekChartRef = ref(null)
const monthChart = shallowRef(null)
const weekChart = shallowRef(null)
const containerRef = ref(null)
const viewMode = ref('total') // 'total' | 'zone'

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
  { main: '#ec4899', light: '#fbcfe8' }
]

function initMonthChart() {
  if (!monthChartRef.value) return
  if (monthChart.value) monthChart.value.dispose()

  const chart = echarts.init(monthChartRef.value, null, { renderer: 'canvas' })

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
              ? '¥' + (p.value >= 10000 ? (p.value / 10000).toFixed(1) + '万' : Math.round(p.value).toLocaleString('zh-CN'))
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
              if (v >= 10000) return (v / 10000).toFixed(0) + '万'
              return v
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
            const total = props.monthTrendZones.reduce((sum, zone) => sum + (x[zone] || 0), 0)
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
    const zones = props.monthTrendZones
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
              const val = p.value >= 10000 ? (p.value / 10000).toFixed(1) + '万' : Math.round(p.value).toLocaleString('zh-CN')
              html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${zoneColors[p.seriesIndex % zoneColors.length].main};margin-right:6px"></span>${p.seriesName}：<strong>¥${val}</strong><br/>`
            }
          })
          html += `</div><div style="border-top:1px solid #e5e7eb;margin-top:4px;padding-top:4px">合计：<strong>¥${total >= 10000 ? (total / 10000).toFixed(1) + '万' : Math.round(total).toLocaleString('zh-CN')}</strong></div>`
          return html
        }
      },
      legend: {
        bottom: 8,
        left: 'center',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 12,
        textStyle: {
          color: '#6b7280',
          fontSize: 12,
          width: 90
        },
        icon: 'roundRect',
        width: '75%'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '20%',
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

function initWeekChart() {
  if (!weekChartRef.value) return

  const chart = echarts.init(weekChartRef.value, null, { renderer: 'canvas' })

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
            ? '¥' + (p.value >= 10000 ? (p.value / 10000).toFixed(1) + '万' : Math.round(p.value).toLocaleString('zh-CN'))
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
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#60a5fa' },
            { offset: 1, color: '#3b82f6' }
          ])
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
  initMonthChart()
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
      <div ref="monthChartRef" class="chart"></div>
    </article>
    <article class="panel">
      <div class="panel-head">
        <h2>近一周趋势</h2>
        <span class="note">日维度</span>
      </div>
      <div ref="weekChartRef" class="chart"></div>
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

.chart {
  width: 100%;
  flex: 1;
  min-height: 260px;
}
</style>
