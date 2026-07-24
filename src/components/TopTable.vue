<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  title: String,
  data: Array
})

const mode = ref('amount')
const containerRef = ref(null)

const sortedData = computed(() => {
  const data = [...props.data].slice(0, 10)
  if (mode.value === 'amount') {
    data.sort((a, b) => b.amount - a.amount)
  } else {
    data.sort((a, b) => b.count - a.count)
  }
  return data
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
    gsap.killTweensOf(rows)
    gsap.fromTo(rows,
      { x: -10, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
    )
  })
}

onMounted(() => {
  if (!containerRef.value) return
  const rows = containerRef.value.querySelectorAll('tbody tr')
  gsap.from(rows, {
    y: 15,
    opacity: 0,
    duration: 0.4,
    stagger: 0.06,
    ease: 'power2.out',
    delay: 0.8
  })
})
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
  border: 1px solid rgba(255,255,255,.74);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
  padding: 18px;
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

.seg {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255,255,255,.7);
  gap: 3px;
}

.seg button {
  border: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  padding: 5px 9px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition);
}

.seg button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--red), var(--gold));
  box-shadow: 0 6px 15px rgba(215,25,32,.18);
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
