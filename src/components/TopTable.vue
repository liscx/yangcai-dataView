<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  title: String,
  data: Array
})

const mode = ref('amount')
const containerRef = ref(null)
let animationContext = null

const sortedData = computed(() => {
  const data = [...props.data]
  if (mode.value === 'amount') {
    data.sort((a, b) => b.amount - a.amount)
  } else {
    data.sort((a, b) => b.count - a.count)
  }
  return data.slice(0, 10)
})

function formatMoney(n) {
  return '¥' + (Math.floor(n / 10000 * 100) / 100).toFixed(2) + '万'
}

function getRankClass(index) {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

function switchMode(newMode) {
  mode.value = newMode
  nextTick(() => {
    if (!containerRef.value) return
    const rows = containerRef.value.querySelectorAll('tbody tr')
    animationContext?.add(() => {
      gsap.killTweensOf(rows)
      gsap.fromTo(rows,
        { x: -10, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
      )
    })
  })
}

onMounted(() => {
  if (!containerRef.value) return
  animationContext = gsap.context(() => {
    gsap.from('tbody tr', {
      y: 15,
      autoAlpha: 0,
      duration: 0.4,
      stagger: 0.06,
      ease: 'power2.out',
      delay: 0.8
    })
  }, containerRef.value)
})

onUnmounted(() => animationContext?.revert())
</script>

<template>
  <article ref="containerRef" class="panel">
    <div class="panel-head">
      <h2>{{ title }}</h2>
      <div class="seg">
        <button
          :class="{ active: mode === 'amount' }"
          @click="switchMode('amount')"
        >按金额</button>
        <button
          :class="{ active: mode === 'count' }"
          @click="switchMode('count')"
        >按订单</button>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="rank-col">#</th>
          <th>名称</th>
          <th class="num">订单数</th>
          <th class="num">金额</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in sortedData"
          :key="item.name"
        >
          <td>
            <span class="rank" :class="getRankClass(index)">{{ index + 1 }}</span>
          </td>
          <td class="name-cell" :title="item.name">{{ item.name }}</td>
          <td class="num">{{ item.count }}</td>
          <td class="num font-bold">{{ formatMoney(item.amount) }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

<style scoped>
.panel {
  --panel-border: rgba(255, 255, 255, 0.74);
  --panel-backdrop: blur(14px);
}







table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th {
  color: var(--muted);
  font-weight: 600;
  text-align: left;
  padding: 9px 6px;
  border-bottom: 1px solid var(--line);
}

th.num {
  text-align: right;
}

td {
  padding: 10px 6px;
  border-bottom: 1px solid #edf1f7;
  vertical-align: middle;
}

td.num {
  text-align: right;
}

td.num.font-bold {
  font-weight: 700;
  color: #263149;
}

.name-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank {
  display: inline-grid;
  place-items: center;
  width: 23px;
  height: 23px;
  border-radius: 7px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  background: var(--muted);
}

.rank-gold {
  background: linear-gradient(135deg, #f6c343, #d89a2b);
}

.rank-silver {
  background: linear-gradient(135deg, #a8b5c8, #8896ab);
}

.rank-bronze {
  background: linear-gradient(135deg, #cd8c52, #b06c3a);
}
</style>
