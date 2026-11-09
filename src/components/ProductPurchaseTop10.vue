<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import StackTabs from './StackTabs.vue'

const props = defineProps({
  data: Array,
  stackTabs: Object
})

// 排序模式：'amount' 按金额 / 'quantity' 按采购件数
const mode = ref('amount')
const containerRef = ref(null)
const copied = ref(false)
let animationContext = null

const sortedData = computed(() => {
  const data = [...(props.data || [])].filter(
    (d) => d && d.name != null && String(d.name).trim() !== ''
  )
  if (mode.value === 'amount') {
    data.sort((a, b) => b.amount - a.amount)
  } else {
    data.sort((a, b) => b.quantity - a.quantity)
  }
  return data.slice(0, 10)
})

function formatMoney(n) {
  return '¥' + (Math.floor(n / 10000 * 100) / 100).toFixed(2) + '万'
}

function formatAmountYuan(n) {
  return '¥' + Number(n).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatQty(n) {
  return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function getRankClass(index) {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

function switchMode(newMode) {
  if (mode.value === newMode) return
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

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch (e) {
    return false
  }
}

async function handleCopy() {
  const title = '商品采购 top10'
  const headers = mode.value === 'amount'
    ? ['排名', '商品名称', '采购件数', '金额']
    : ['排名', '商品名称', '采购件数', '金额']
  const rows = sortedData.value.map((item, i) => [
    i + 1,
    item.name,
    formatQty(item.quantity),
    formatAmountYuan(Math.round(item.amount * 100) / 100)
  ])
  const tsv = [title, headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n')
  const ok = await copyToClipboard(tsv)
  if (ok) {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }
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
      <div class="head-left">
        <h2>商品采购 top10</h2>
        <button
          class="copy-btn"
          :class="{ 'is-copied': copied }"
          :title="copied ? '已复制' : '复制到剪贴板'"
          @click.stop="handleCopy"
        >
          <svg v-if="!copied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
      <div class="head-right">
        <div class="seg">
          <button
            :class="{ active: mode === 'amount' }"
            @click="switchMode('amount')"
          >按金额</button>
          <button
            :class="{ active: mode === 'quantity' }"
            @click="switchMode('quantity')"
          >按采购件数</button>
        </div>
        <StackTabs
          v-if="stackTabs"
          :tabs="stackTabs.tabs"
          :active="stackTabs.active"
          @switch="stackTabs.onSwitch"
        />
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="rank-col">#</th>
          <th>商品名称</th>
          <th class="num">采购件数</th>
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
          <td class="num">{{ formatQty(item.quantity) }}</td>
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.panel-head h2 {
  font-size: 18px;
  white-space: nowrap;
  flex-shrink: 0;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 0;
  background: #f1f5f9;
  border-radius: 5px;
  cursor: pointer;
  color: #64748b;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.copy-btn:active {
  transform: scale(0.92);
}

.copy-btn.is-copied {
  background: #d1fae5;
  color: #059669;
}

.copy-btn svg {
  display: block;
}

.seg {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: #f1f5f9;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.seg button {
  border: 0;
  background: transparent;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.seg button.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.seg button:hover:not(.active) {
  color: #1e293b;
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
