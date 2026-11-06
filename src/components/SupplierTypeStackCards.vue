<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  ecommerceData: Array,
  localData: Array
})

const ecomCardRef = ref(null)
const localCardRef = ref(null)
const ecomTbodyRef = ref(null)
const localTbodyRef = ref(null)
const containerRef = ref(null)

const activeCard = ref('ecom')
const isAnimating = ref(false)

// 每张子卡片独立的排序模式：'amount' 按金额 / 'count' 按订单
const ecomMode = ref('amount')
const localMode = ref('amount')

const sortedEcomData = computed(() => {
  const data = [...(props.ecommerceData || [])]
  data.sort((a, b) =>
    ecomMode.value === 'amount' ? b.amount - a.amount : b.count - a.count
  )
  return data.slice(0, 10)
})

const sortedLocalData = computed(() => {
  const data = [...(props.localData || [])]
  data.sort((a, b) =>
    localMode.value === 'amount' ? b.amount - a.amount : b.count - a.count
  )
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

function getRankClass(index) {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

function animateRows(tbodyEl) {
  if (!tbodyEl) return
  nextTick(() => {
    const rows = tbodyEl.querySelectorAll('tr')
    gsap.killTweensOf(rows)
    gsap.fromTo(rows,
      { x: -10, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out' }
    )
  })
}

const ecomCopied = ref(false)
const localCopied = ref(false)

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

function buildTsv(title, headers, rows) {
  const lines = [title, headers.join('\t')]
  for (const r of rows) {
    lines.push(r.join('\t'))
  }
  return lines.join('\n')
}

async function handleCopy(which) {
  const isEcom = which === 'ecom'
  const data = isEcom ? sortedEcomData.value : sortedLocalData.value
  const title = isEcom ? '电商供应商 top10' : '本地供应商 top10'
  const headers = ['排名', '名称', '订单数', '金额']

  const rows = data.map((item, i) => {
    return [
      i + 1,
      item.name,
      item.count,
      formatAmountYuan(Math.round(item.amount * 100) / 100)
    ]
  })

  const tsv = buildTsv(title, headers, rows)
  const ok = await copyToClipboard(tsv)
  if (ok) {
    const flag = isEcom ? ecomCopied : localCopied
    flag.value = true
    setTimeout(() => { flag.value = false }, 1500)
  }
}

function switchEcomMode(newMode) {
  if (ecomMode.value === newMode) return
  ecomMode.value = newMode
  animateRows(ecomTbodyRef.value)
}

function switchLocalMode(newMode) {
  if (localMode.value === newMode) return
  localMode.value = newMode
  animateRows(localTbodyRef.value)
}

function switchCard(targetCard) {
  if (isAnimating.value || activeCard.value === targetCard) return
  isAnimating.value = true

  const isEcomFront = activeCard.value === 'ecom'
  const topEl = isEcomFront ? ecomCardRef.value : localCardRef.value
  const behindEl = isEcomFront ? localCardRef.value : ecomCardRef.value

  const tl = gsap.timeline({
    onComplete: () => {
      activeCard.value = targetCard
      gsap.set([topEl, behindEl], { clearProps: 'all' })
      isAnimating.value = false
    }
  })

  tl.to(topEl, { x: -80, y: 30, rotation: -2, opacity: 0, duration: 0.3, ease: 'power1.in' })
  tl.set(behindEl, { zIndex: 2 })
  tl.to(behindEl, { x: 0, y: 0, opacity: 1, duration: 0.6, ease: 'power1.out' })
}

let animationContext = null

onMounted(() => {
  if (!containerRef.value) return
  animationContext = gsap.context(() => {
    gsap.from('.stacked-card-wrapper', {
      y: 30, autoAlpha: 0, duration: 0.6, ease: 'power2.out', clearProps: 'all'
    })
    gsap.from(ecomTbodyRef.value ? ecomTbodyRef.value.querySelectorAll('tr') : [], {
      y: 15, autoAlpha: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out', delay: 0.8
    })
  }, containerRef.value)
})

onUnmounted(() => {
  animationContext?.revert()
})
</script>

<template>
  <div ref="containerRef" class="top-stack">
    <div class="stacked-card-wrapper">
      <!-- 堆叠卡片 1：电商供应商 top10 -->
      <article
        ref="ecomCardRef"
        class="panel panel-card"
        :class="activeCard === 'ecom' ? 'is-front' : 'is-back'"
        @click="activeCard !== 'ecom' && switchCard('ecom')"
      >
        <div class="panel-head">
          <div class="head-left">
            <h2>电商供应商 top10</h2>
            <button
              class="copy-btn"
              :class="{ 'is-copied': ecomCopied }"
              :title="ecomCopied ? '已复制' : '复制到剪贴板'"
              @click.stop="handleCopy('ecom')"
            >
              <svg v-if="!ecomCopied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                :class="{ active: ecomMode === 'amount' }"
                @click.stop="switchEcomMode('amount')"
              >按金额</button>
              <button
                :class="{ active: ecomMode === 'count' }"
                @click.stop="switchEcomMode('count')"
              >按订单</button>
            </div>
            <div class="card-tab-switcher">
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'ecom' }"
                @click.stop="switchCard('ecom')"
              >🛒 电商</button>
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'local' }"
                @click.stop="switchCard('local')"
              >🏪 本地</button>
            </div>
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
          <tbody ref="ecomTbodyRef">
            <tr
              v-for="(item, index) in sortedEcomData"
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

      <!-- 堆叠卡片 2：本地供应商 top10 -->
      <article
        ref="localCardRef"
        class="panel panel-card"
        :class="activeCard === 'local' ? 'is-front' : 'is-back'"
        @click="activeCard !== 'local' && switchCard('local')"
      >
        <div class="panel-head">
          <div class="head-left">
            <h2>本地供应商 top10</h2>
            <button
              class="copy-btn"
              :class="{ 'is-copied': localCopied }"
              :title="localCopied ? '已复制' : '复制到剪贴板'"
              @click.stop="handleCopy('local')"
            >
              <svg v-if="!localCopied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                :class="{ active: localMode === 'amount' }"
                @click.stop="switchLocalMode('amount')"
              >按金额</button>
              <button
                :class="{ active: localMode === 'count' }"
                @click.stop="switchLocalMode('count')"
              >按订单</button>
            </div>
            <div class="card-tab-switcher">
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'ecom' }"
                @click.stop="switchCard('ecom')"
              >🛒 电商</button>
              <button
                class="tab-btn"
                :class="{ active: activeCard === 'local' }"
                @click.stop="switchCard('local')"
              >🏪 本地</button>
            </div>
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
          <tbody ref="localTbodyRef">
            <tr
              v-for="(item, index) in sortedLocalData"
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
    </div>
  </div>
</template>

<style scoped>
.top-stack {
  display: grid;
  gap: 16px;
}

.stacked-card-wrapper {
  position: relative;
  width: 100%;
  min-height: 480px;
}

.panel-card {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% - 8px);
  height: 100%;
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

.panel-card.is-front {
  top: 0;
  left: 0;
  transform: translate(0, 0);
  z-index: 2;
  opacity: 1;
  box-shadow: 0 10px 28px rgba(26, 35, 50, 0.12), 0 2px 6px rgba(37, 99, 235, 0.08);
}

.panel-card.is-back {
  top: 0;
  left: 0;
  transform: translate(8px, 6px);
  z-index: 1;
  opacity: 0.92;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(26, 35, 50, 0.08);
  border-color: rgba(37, 99, 235, 0.35);
  background: var(--panel, rgba(255, 255, 255, 0.92));
}

.panel-card.is-back .panel-head,
.panel-card.is-back table {
  pointer-events: none;
}

.panel-card.is-back:hover {
  opacity: 0.98;
  border-color: #3b82f6;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.18);
}

.panel-card.is-back:hover .panel-head,
.panel-card.is-back:hover table {
  opacity: 0.45;
}

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
  padding: 4px 8px;
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
  gap: 8px;
}

.panel-head h2 {
  font-size: 18px;
  white-space: nowrap;
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

.head-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
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

/* 分段控件（按金额 / 按订单）— 紧凑风格，与 TopTable 一致 */
.seg {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: #f1f5f9;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
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
</style>
