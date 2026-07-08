<script setup>
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
import * as echarts from 'echarts'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const props = defineProps({
  monthTrend: Array,
  weekTrend: Array
})

const monthChartRef = ref(null)
const weekChartRef = ref(null)
const monthChart = shallowRef(null)
const weekChart = shallowRef(null)
const containerRef = ref(null)

function initChart(el, data, type) {
  const chart = echarts.init(el, null, { renderer: 'canvas' })

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#172033', fontSize: 13 },
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(x => x.label),
      axisLine: { lineStyle: { color: '#dfe6f2' } },
      axisLabel: { color: '#637085', fontSize: 12 }
    },
    yAxis: [
      {
        type: 'value',
        name: '金额',
        nameTextStyle: { color: '#637085', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#edf1f7', type: 'dashed' } },
        axisLabel: {
          color: '#637085',
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
        nameTextStyle: { color: '#637085', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#637085', fontSize: 11 }
      }
    ],
    series: [
      {
        name: '订单金额',
        type: 'bar',
        data: data.map(x => Number(x.amount.toFixed(2))),
        barWidth: type === 'month' ? '42%' : '35%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#2f6df6' },
            { offset: 1, color: '#00a7a2' }
          ])
        }
      },
      {
        name: '订单数',
        type: 'line',
        yAxisIndex: 1,
        data: data.map(x => x.count),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#d71920', width: 3 },
        itemStyle: { color: '#d71920', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(215, 25, 32, 0.15)' },
            { offset: 1, color: 'rgba(215, 25, 32, 0)' }
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

  return chart
}

onMounted(() => {
  if (monthChartRef.value) {
    monthChart.value = initChart(monthChartRef.value, props.monthTrend, 'month')
  }
  if (weekChartRef.value) {
    weekChart.value = initChart(weekChartRef.value, props.weekTrend, 'week')
  }

  // 滚动触发动画
  if (containerRef.value) {
    gsap.from(containerRef.value.querySelectorAll('.chart-wrapper'), {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: containerRef.value,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
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
      </div>
      <div ref="monthChartRef" class="chart chart-month"></div>
    </article>
    <article class="panel">
      <div class="panel-head">
        <h2>近一周趋势</h2>
        <span class="note">日维度</span>
      </div>
      <div ref="weekChartRef" class="chart chart-week"></div>
    </article>
  </div>
</template>

<style scoped>
.trend-charts {
  display: grid;
  gap: 16px;
  height: 100%;
}

.panel {
  border: 1px solid rgba(255,255,255,.74);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
  padding: 18px;
  display: flex;
  flex-direction: column;
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

.chart {
  width: 100%;
  flex: 1;
  min-height: 260px;
}
</style>
